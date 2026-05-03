package com.planitt.mobile.ar;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.opengl.GLES11Ext;
import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.ar.core.Anchor;
import com.google.ar.core.ArCoreApk;
import com.google.ar.core.Camera;
import com.google.ar.core.Config;
import com.google.ar.core.Frame;
import com.google.ar.core.HitResult;
import com.google.ar.core.Plane;
import com.google.ar.core.Pose;
import com.google.ar.core.Session;
import com.google.ar.core.TrackingState;
import com.google.ar.core.Trackable;
import com.google.ar.core.exceptions.CameraNotAvailableException;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;

import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

public class ARShelfViewModule extends ReactContextBaseJavaModule implements GLSurfaceView.Renderer {
    private static final String TAG = "ARShelfViewNative";
    private static final int CAMERA_PERMISSION_CODE = 7003;

    private Promise viewPromise;
    private Session arSession;
    private GLSurfaceView glSurfaceView;
    private FrameLayout arOverlay;
    private ShelfOverlayView shelfOverlay;
    private TextView statusText;

    private int cameraTextureId = -1;
    private boolean sessionConfigured = false;
    private volatile boolean sessionResumed = false;
    private int viewWidth, viewHeight;

    private Anchor shelfAnchor = null;
    private volatile boolean pendingTap = false;
    private float tapX, tapY;

    // Parsed Data
    private String fixtureName;
    private float shelfWidth, shelfHeight, shelfDepth;
    private List<ShelfLevel> levels = new ArrayList<>();
    private List<ProductBox> products = new ArrayList<>();
    private float displayScale = 0.2f; // 1:5 scale

    // GL Programs
    private int backgroundProgram;
    private int backgroundPositionAttrib;
    private int backgroundTexCoordAttrib;

    private int boxProgram;
    private int boxPositionAttrib;
    private int boxNormalAttrib;
    private int boxColorUniform;
    private int boxMvpUniform;

    // Matrices
    private final float[] viewMatrix = new float[16];
    private final float[] projMatrix = new float[16];
    private final float[] vpMatrix = new float[16];
    private final float[] modelMatrix = new float[16];
    private final float[] mvpMatrix = new float[16];

    // Data structures for JSON parsing
    private static class ShelfLevel {
        float yOffset, width, depth, thickness;
    }

    private static class ProductBox {
        String name, sku;
        float x, y, z, width, height, depth;
        float[] color; // r,g,b,a
        boolean showLabel;
    }

    // ... shaders remain unchanged
    private static final String BG_VS =
            "attribute vec4 a_Position;\n" +
            "attribute vec2 a_TexCoord;\n" +
            "varying vec2 v_TexCoord;\n" +
            "void main() {\n" +
            "  gl_Position = a_Position;\n" +
            "  v_TexCoord = a_TexCoord;\n" +
            "}";

    private static final String BG_FS =
            "#extension GL_OES_EGL_image_external : require\n" +
            "precision mediump float;\n" +
            "varying vec2 v_TexCoord;\n" +
            "uniform samplerExternalOES u_Texture;\n" +
            "void main() {\n" +
            "  gl_FragColor = texture2D(u_Texture, v_TexCoord);\n" +
            "}";

    private static final String BOX_VS =
            "uniform mat4 u_MVP;\n" +
            "attribute vec4 a_Position;\n" +
            "attribute vec3 a_Normal;\n" +
            "varying vec3 v_Normal;\n" +
            "void main() {\n" +
            "  gl_Position = u_MVP * a_Position;\n" +
            "  v_Normal = a_Normal;\n" +
            "}";

    private static final String BOX_FS =
            "precision mediump float;\n" +
            "uniform vec4 u_Color;\n" +
            "varying vec3 v_Normal;\n" +
            "void main() {\n" +
            "  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));\n" +
            "  float ambient = 0.6;\n" + 
            "  float diff = max(dot(normalize(v_Normal), lightDir), 0.0);\n" +
            "  float intensity = ambient + (diff * 0.5);\n" + 
            "  gl_FragColor = vec4(u_Color.rgb * intensity, u_Color.a);\n" +
            "}";

    private static final float[] QUAD_COORDS = { -1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f };
    private float[] bgTexCoords = {0f, 1f, 1f, 1f, 0f, 0f, 1f, 0f};

    private static final float[] CUBE_VERTICES = {
        // Front face
        -0.5f, -0.5f,  0.5f,   0.5f, -0.5f,  0.5f,  -0.5f,  0.5f,  0.5f,
        -0.5f,  0.5f,  0.5f,   0.5f, -0.5f,  0.5f,   0.5f,  0.5f,  0.5f,
        // Back face
         0.5f, -0.5f, -0.5f,  -0.5f, -0.5f, -0.5f,   0.5f,  0.5f, -0.5f,
         0.5f,  0.5f, -0.5f,  -0.5f, -0.5f, -0.5f,  -0.5f,  0.5f, -0.5f,
        // Left face
        -0.5f, -0.5f, -0.5f,  -0.5f, -0.5f,  0.5f,  -0.5f,  0.5f, -0.5f,
        -0.5f,  0.5f, -0.5f,  -0.5f, -0.5f,  0.5f,  -0.5f,  0.5f,  0.5f,
        // Right face
         0.5f, -0.5f,  0.5f,   0.5f, -0.5f, -0.5f,   0.5f,  0.5f,  0.5f,
         0.5f,  0.5f,  0.5f,   0.5f, -0.5f, -0.5f,   0.5f,  0.5f, -0.5f,
        // Top face
        -0.5f,  0.5f,  0.5f,   0.5f,  0.5f,  0.5f,  -0.5f,  0.5f, -0.5f,
        -0.5f,  0.5f, -0.5f,   0.5f,  0.5f,  0.5f,   0.5f,  0.5f, -0.5f,
        // Bottom face
        -0.5f, -0.5f, -0.5f,   0.5f, -0.5f, -0.5f,  -0.5f, -0.5f,  0.5f,
        -0.5f, -0.5f,  0.5f,   0.5f, -0.5f, -0.5f,   0.5f, -0.5f,  0.5f
    };

    private static final short[] CUBE_EDGES = {
        0,1, 1,5, 5,2, 2,0, // Front
        6,7, 7,11, 11,8, 8,6, // Back
        0,6, 1,7, 5,11, 2,8  // Connections
    };

    private static final float[] CUBE_NORMALS = {
        // Front
         0.0f,  0.0f,  1.0f,   0.0f,  0.0f,  1.0f,   0.0f,  0.0f,  1.0f,
         0.0f,  0.0f,  1.0f,   0.0f,  0.0f,  1.0f,   0.0f,  0.0f,  1.0f,
        // Back
         0.0f,  0.0f, -1.0f,   0.0f,  0.0f, -1.0f,   0.0f,  0.0f, -1.0f,
         0.0f,  0.0f, -1.0f,   0.0f,  0.0f, -1.0f,   0.0f,  0.0f, -1.0f,
        // Left
        -1.0f,  0.0f,  0.0f,  -1.0f,  0.0f,  0.0f,  -1.0f,  0.0f,  0.0f,
        -1.0f,  0.0f,  0.0f,  -1.0f,  0.0f,  0.0f,  -1.0f,  0.0f,  0.0f,
        // Right
         1.0f,  0.0f,  0.0f,   1.0f,  0.0f,  0.0f,   1.0f,  0.0f,  0.0f,
         1.0f,  0.0f,  0.0f,   1.0f,  0.0f,  0.0f,   1.0f,  0.0f,  0.0f,
        // Top
         0.0f,  1.0f,  0.0f,   0.0f,  1.0f,  0.0f,   0.0f,  1.0f,  0.0f,
         0.0f,  1.0f,  0.0f,   0.0f,  1.0f,  0.0f,   0.0f,  1.0f,  0.0f,
        // Bottom
         0.0f, -1.0f,  0.0f,   0.0f, -1.0f,  0.0f,   0.0f, -1.0f,  0.0f,
         0.0f, -1.0f,  0.0f,   0.0f, -1.0f,  0.0f,   0.0f, -1.0f,  0.0f
    };

    private FloatBuffer cubeVertBuffer;
    private FloatBuffer cubeNormBuffer;
    private java.nio.ShortBuffer cubeEdgeBuffer;

    public ARShelfViewModule(ReactApplicationContext ctx) {
        super(ctx);
        cubeVertBuffer = ByteBuffer.allocateDirect(CUBE_VERTICES.length * 4)
                .order(ByteOrder.nativeOrder()).asFloatBuffer();
        cubeVertBuffer.put(CUBE_VERTICES).position(0);

        cubeNormBuffer = ByteBuffer.allocateDirect(CUBE_NORMALS.length * 4)
                .order(ByteOrder.nativeOrder()).asFloatBuffer();
        cubeNormBuffer.put(CUBE_NORMALS).position(0);

        cubeEdgeBuffer = ByteBuffer.allocateDirect(CUBE_EDGES.length * 2)
                .order(ByteOrder.nativeOrder()).asShortBuffer();
        cubeEdgeBuffer.put(CUBE_EDGES).position(0);
    }

    @Override
    public String getName() {
        return "ARShelfViewModule";
    }

    @ReactMethod
    public void showShelfInAR(String shelfDataJson, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity");
            return;
        }

        viewPromise = promise;
        try {
            parseShelfData(shelfDataJson);
        } catch (Exception e) {
            promise.reject("PARSE_ERROR", "Failed to parse shelf data: " + e.getMessage());
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(activity,
                            new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_CODE);
                    rejectPromise("PERMISSION_NEEDED", "Camera permission required.");
                    return;
                }

                ArCoreApk.Availability avail = ArCoreApk.getInstance().checkAvailability(activity);
                if (avail == ArCoreApk.Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE) {
                    rejectPromise("UNSUPPORTED", "Device does not support AR.");
                    return;
                }

                ArCoreApk.InstallStatus installStatus = ArCoreApk.getInstance().requestInstall(activity, true);
                if (installStatus != ArCoreApk.InstallStatus.INSTALLED) {
                    rejectPromise("NOT_INSTALLED", "ARCore installation required.");
                    return;
                }

                arSession = new Session(activity);
                Config config = new Config(arSession);
                config.setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL);
                config.setUpdateMode(Config.UpdateMode.LATEST_CAMERA_IMAGE);
                config.setFocusMode(Config.FocusMode.AUTO);
                arSession.configure(config);

                showAROverlay(activity);

            } catch (Exception e) {
                rejectPromise("AR_ERROR", "AR init failed: " + e);
            }
        });
    }

    private void parseShelfData(String jsonString) throws JSONException {
        JSONObject obj = new JSONObject(jsonString);
        fixtureName = obj.optString("fixtureName", "Shelf");
        // Read display scale
        displayScale = (float) obj.optDouble("displayScale", 0.2); // Default 1:5 scale
        // Convert cm to meters immediately
        shelfWidth = (float) obj.optDouble("widthCm", 100) / 100f;
        shelfHeight = (float) obj.optDouble("heightCm", 200) / 100f;
        shelfDepth = (float) obj.optDouble("depthCm", 45) / 100f;

        levels.clear();
        JSONArray levelsArr = obj.optJSONArray("levels");
        if (levelsArr != null) {
            for (int i = 0; i < levelsArr.length(); i++) {
                JSONObject lObj = levelsArr.getJSONObject(i);
                ShelfLevel l = new ShelfLevel();
                l.yOffset = (float) lObj.optDouble("heightFromFloorCm", 0) / 100f;
                l.width = (float) lObj.optDouble("widthCm", 100) / 100f;
                l.depth = (float) lObj.optDouble("depthCm", 40) / 100f;
                l.thickness = (float) lObj.optDouble("heightCm", 4) / 100f;
                levels.add(l);
            }
        }

        products.clear();
        JSONArray productsArr = obj.optJSONArray("products");
        if (productsArr != null) {
            for (int i = 0; i < productsArr.length(); i++) {
                JSONObject pObj = productsArr.getJSONObject(i);
                
                String name = pObj.optString("name", "Product");
                String sku = pObj.optString("sku", "");
                
                // Position in meters (relative to bottom-left of shelf)
                float x = (float) pObj.optDouble("x", 0) / 100f;
                float y = (float) pObj.optDouble("y", 0) / 100f; // Level height
                float z = 0; // Front of shelf

                float width = (float) pObj.optDouble("widthCm", 10) / 100f;
                float height = (float) pObj.optDouble("heightCm", 10) / 100f;
                float depth = (float) pObj.optDouble("depthCm", 10) / 100f;
                
                String hex = pObj.optString("colorHex", "#CCCCCC");
                int c = Color.parseColor(hex);
                float[] color = new float[]{
                    Color.red(c) / 255f,
                    Color.green(c) / 255f,
                    Color.blue(c) / 255f,
                    1.0f
                };

                // Add multiple boxes based on facings, depth, height
                int facings = pObj.optInt("facings", 1);
                int unitsDeep = pObj.optInt("unitsDeep", 1);
                int unitsHigh = pObj.optInt("unitsHigh", 1);

                for (int f = 0; f < facings; f++) {
                    for (int d = 0; d < unitsDeep; d++) {
                        for (int h = 0; h < unitsHigh; h++) {
                            ProductBox instance = new ProductBox();
                            instance.name = name + " (" + facings + "x" + unitsHigh + ")";
                            instance.sku = sku;
                            instance.x = x + (f * width);
                            instance.y = y + (h * height);
                            // AR Z axis goes negative away from user. Assuming shelf anchors at Z=0 (front edge)
                            instance.z = z - (d * depth); 
                            instance.width = width;
                            instance.height = height;
                            instance.depth = depth;
                            instance.color = color;
                            
                            // Show label on the middle front instance
                            instance.showLabel = (f == facings / 2 && d == 0 && h == unitsHigh / 2);
                            
                            products.add(instance);
                        }
                    }
                }
            }
        }
    }

    private Button placeButton;
    private Pose hoverPose;
    private boolean isScanning = true;

    private void showAROverlay(Activity activity) {
        arOverlay = new FrameLayout(activity);
        arOverlay.setBackgroundColor(Color.BLACK);

        glSurfaceView = new GLSurfaceView(activity);
        glSurfaceView.setPreserveEGLContextOnPause(true);
        glSurfaceView.setEGLContextClientVersion(2);
        glSurfaceView.setEGLConfigChooser(8, 8, 8, 8, 16, 0);
        glSurfaceView.setRenderer(this);
        glSurfaceView.setRenderMode(GLSurfaceView.RENDERMODE_CONTINUOUSLY);
        arOverlay.addView(glSurfaceView, new FrameLayout.LayoutParams(-1, -1));

        shelfOverlay = new ShelfOverlayView(activity);
        arOverlay.addView(shelfOverlay, new FrameLayout.LayoutParams(-1, -1));

        // UI Layer
        LinearLayout ui = new LinearLayout(activity);
        ui.setOrientation(LinearLayout.VERTICAL);
        ui.setPadding(48, 100, 48, 60);

        LinearLayout topBar = new LinearLayout(activity);
        topBar.setGravity(Gravity.START);
        Button closeBtn = new Button(activity);
        closeBtn.setText("✕ Close");
        closeBtn.setBackgroundColor(0x60000000);
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setPadding(36, 16, 36, 16);
        closeBtn.setOnClickListener(v -> closeAR());
        topBar.addView(closeBtn);
        ui.addView(topBar);

        ui.addView(new View(activity), new LinearLayout.LayoutParams(-1, 0, 1.0f));

        statusText = new TextView(activity);
        statusText.setTextColor(Color.WHITE);
        statusText.setTextSize(15);
        statusText.setGravity(Gravity.CENTER);
        android.graphics.drawable.GradientDrawable statusBg = new android.graphics.drawable.GradientDrawable();
        statusBg.setColor(0xAA1A1A2E);
        statusBg.setCornerRadius(24f);
        statusText.setBackground(statusBg);
        statusText.setPadding(40, 20, 40, 20);
        statusText.setText("Loading AR Data & Scanning surfaces...");
        ui.addView(statusText);

        placeButton = new Button(activity);
        placeButton.setText("Place Shelf Here");
        android.graphics.drawable.GradientDrawable btnBg = new android.graphics.drawable.GradientDrawable();
        btnBg.setColor(0xFF00C853);
        btnBg.setCornerRadius(24f);
        placeButton.setBackground(btnBg);
        placeButton.setTextColor(Color.WHITE);
        placeButton.setPadding(32, 32, 32, 32);
        placeButton.setEnabled(false);
        placeButton.setOnClickListener(v -> {
            if (hoverPose != null && shelfAnchor == null && arSession != null) {
                shelfAnchor = arSession.createAnchor(hoverPose);
                if (shelfOverlay != null) {
                    shelfOverlay.setAnchored(true);
                }
            }
        });
        
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnParams.setMargins(0, 32, 0, 0);
        ui.addView(placeButton, btnParams);

        // Add a crosshair dot at the center of the screen
        View crosshair = new View(activity);
        crosshair.setBackgroundColor(Color.WHITE);
        FrameLayout.LayoutParams crosshairParams = new FrameLayout.LayoutParams(10, 10);
        crosshairParams.gravity = Gravity.CENTER;
        arOverlay.addView(crosshair, crosshairParams);

        arOverlay.addView(ui, new FrameLayout.LayoutParams(-1, -1));

        ViewGroup root = (ViewGroup) activity.getWindow().getDecorView().getRootView();
        root.addView(arOverlay, new FrameLayout.LayoutParams(-1, -1));
        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        try {
            arSession.resume();
            sessionResumed = true;
        } catch (Exception e) {
            rejectPromise("AR_ERROR", "AR resume failed: " + e);
        }
    }

    private void closeAR() {
        sessionResumed = false;
        Activity activity = getCurrentActivity();

        if (arSession != null) {
            arSession.pause();
            arSession.close();
            arSession = null;
        }

        if (shelfAnchor != null) {
            shelfAnchor.detach();
            shelfAnchor = null;
        }
        sessionConfigured = false;

        if (activity != null && arOverlay != null) {
            activity.runOnUiThread(() -> {
                if (shelfOverlay != null) shelfOverlay.stopAnimations();
                ViewGroup root = (ViewGroup) activity.getWindow().getDecorView().getRootView();
                root.removeView(arOverlay);
                arOverlay = null;
                glSurfaceView = null;
                shelfOverlay = null;
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        if (viewPromise != null) {
            viewPromise.resolve(true);
            viewPromise = null;
        }
    }

    private void rejectPromise(String code, String message) {
        if (viewPromise != null) {
            viewPromise.reject(code, message);
            viewPromise = null;
        }
    }

    // --- GL Renderer ---

    @Override
    public void onSurfaceCreated(GL10 gl, EGLConfig config) {
        GLES20.glClearColor(0f, 0f, 0f, 1f);
        GLES20.glEnable(GLES20.GL_DEPTH_TEST);

        int[] tex = new int[1];
        GLES20.glGenTextures(1, tex, 0);
        cameraTextureId = tex[0];
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTextureId);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);

        backgroundProgram = loadProgram(BG_VS, BG_FS);
        backgroundPositionAttrib = GLES20.glGetAttribLocation(backgroundProgram, "a_Position");
        backgroundTexCoordAttrib = GLES20.glGetAttribLocation(backgroundProgram, "a_TexCoord");

        boxProgram = loadProgram(BOX_VS, BOX_FS);
        boxPositionAttrib = GLES20.glGetAttribLocation(boxProgram, "a_Position");
        boxNormalAttrib = GLES20.glGetAttribLocation(boxProgram, "a_Normal");
        boxColorUniform = GLES20.glGetUniformLocation(boxProgram, "u_Color");
        boxMvpUniform = GLES20.glGetUniformLocation(boxProgram, "u_MVP");
    }

    @Override
    public void onSurfaceChanged(GL10 gl, int w, int h) {
        viewWidth = w;
        viewHeight = h;
        GLES20.glViewport(0, 0, w, h);
        if (arSession != null) {
            Activity a = getCurrentActivity();
            if (a != null) {
                arSession.setDisplayGeometry(a.getWindowManager().getDefaultDisplay().getRotation(), w, h);
            }
        }
    }

    @Override
    public void onDrawFrame(GL10 gl) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT | GLES20.GL_DEPTH_BUFFER_BIT);
        if (arSession == null || !sessionResumed) return;

        if (!sessionConfigured && cameraTextureId != -1) {
            arSession.setCameraTextureName(cameraTextureId);
            sessionConfigured = true;
        }

        Frame frame;
        try {
            frame = arSession.update();
        } catch (Exception e) {
            return;
        }

        if (frame.hasDisplayGeometryChanged()) {
            frame.transformCoordinates2d(
                    com.google.ar.core.Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,
                    FloatBuffer.wrap(QUAD_COORDS),
                    com.google.ar.core.Coordinates2d.TEXTURE_NORMALIZED,
                    FloatBuffer.wrap(bgTexCoords));
        }

        drawBackground();

        Camera cam = frame.getCamera();
        TrackingState state = cam.getTrackingState();

        Activity activity = getCurrentActivity();
        if (activity == null) return;

        if (state == TrackingState.TRACKING) {
            cam.getViewMatrix(viewMatrix, 0);
            cam.getProjectionMatrix(projMatrix, 0, 0.1f, 100f);
            Matrix.multiplyMM(vpMatrix, 0, projMatrix, 0, viewMatrix, 0);

            activity.runOnUiThread(() -> {
                if (shelfOverlay != null) shelfOverlay.setTracking(true);
            });

            if (shelfAnchor == null) {
                // Hover hit test
                List<HitResult> hitResults = frame.hitTest(viewWidth / 2f, viewHeight / 2f);
                boolean foundPlane = false;
                for (HitResult hit : hitResults) {
                    Trackable trackable = hit.getTrackable();
                    if (trackable instanceof Plane && ((Plane) trackable).isPoseInPolygon(hit.getHitPose())) {
                        hoverPose = hit.getHitPose();
                        foundPlane = true;
                        
                        // Draw dummy shelf
                        hoverPose.toMatrix(modelMatrix, 0);
                        drawShelf(true);

                        activity.runOnUiThread(() -> {
                            if (isScanning) {
                                isScanning = false;
                                placeButton.setEnabled(true);
                                statusText.setText("Ready to place. Tap 'Place Shelf Here'.");
                            }
                        });
                        break;
                    }
                }
                if (!foundPlane) {
                    hoverPose = null;
                    activity.runOnUiThread(() -> {
                        if (!isScanning) {
                            isScanning = true;
                            placeButton.setEnabled(false);
                            statusText.setText("Scanning for surfaces...");
                        }
                    });
                }
            } else {
                // Shelf is placed
                activity.runOnUiThread(() -> {
                    if (placeButton != null && placeButton.getVisibility() == View.VISIBLE) {
                        placeButton.setVisibility(View.GONE);
                        statusText.setVisibility(View.GONE);
                    }
                });

                shelfAnchor.getPose().toMatrix(modelMatrix, 0);
                drawShelf(false);

                // Compute screen position of shelf center to show label
                float[] shelfCenterWorld = new float[4];
                // Center roughly at middle of shelf
                float[] localCenter = { shelfWidth * displayScale / 2f, shelfHeight * displayScale + 0.1f, 0, 1f };
                Matrix.multiplyMV(shelfCenterWorld, 0, modelMatrix, 0, localCenter, 0);

                float[] screenPos = worldToScreen(shelfCenterWorld);

                // Compute screen positions for all products
                List<ShelfOverlayView.ProductLabel> labels = new ArrayList<>();
                for (ProductBox p : products) {
                    if (!p.showLabel) continue;

                    float[] localProd = {
                        (p.x + p.width / 2f) * displayScale,
                        (p.y + p.height / 2f + 0.04f) * displayScale,
                        (p.z - p.depth / 2f) * displayScale,
                        1f
                    };
                    float[] prodWorld = new float[4];
                    Matrix.multiplyMV(prodWorld, 0, modelMatrix, 0, localProd, 0);
                    float[] pScreenPos = worldToScreen(prodWorld);
                    if (pScreenPos != null) {
                        // Only add if on screen
                        if (pScreenPos[0] > 0 && pScreenPos[0] < viewWidth && pScreenPos[1] > 0 && pScreenPos[1] < viewHeight) {
                            labels.add(new ShelfOverlayView.ProductLabel(p.name, pScreenPos[0], pScreenPos[1], true));
                        }
                    }
                }

                activity.runOnUiThread(() -> {
                    if (shelfOverlay != null) {
                        if (screenPos != null) {
                            shelfOverlay.setSelectedProduct(fixtureName, "Shelf Layout", screenPos[0], screenPos[1]);
                        }
                        shelfOverlay.setProducts(labels);
                    }
                });
            }
        }
    }

    private void drawBackground() {
        GLES20.glDepthMask(false);
        GLES20.glUseProgram(backgroundProgram);

        FloatBuffer vb = ByteBuffer.allocateDirect(QUAD_COORDS.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
        vb.put(QUAD_COORDS).position(0);

        FloatBuffer tb = ByteBuffer.allocateDirect(bgTexCoords.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
        tb.put(bgTexCoords).position(0);

        GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTextureId);
        GLES20.glVertexAttribPointer(backgroundPositionAttrib, 2, GLES20.GL_FLOAT, false, 0, vb);
        GLES20.glVertexAttribPointer(backgroundTexCoordAttrib, 2, GLES20.GL_FLOAT, false, 0, tb);
        GLES20.glEnableVertexAttribArray(backgroundPositionAttrib);
        GLES20.glEnableVertexAttribArray(backgroundTexCoordAttrib);
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4);
        GLES20.glDisableVertexAttribArray(backgroundPositionAttrib);
        GLES20.glDisableVertexAttribArray(backgroundTexCoordAttrib);
        GLES20.glDepthMask(true);
    }

    private void drawShelf(boolean isDummy) {
        GLES20.glUseProgram(boxProgram);
        GLES20.glVertexAttribPointer(boxPositionAttrib, 3, GLES20.GL_FLOAT, false, 0, cubeVertBuffer);
        GLES20.glVertexAttribPointer(boxNormalAttrib, 3, GLES20.GL_FLOAT, false, 0, cubeNormBuffer);
        GLES20.glEnableVertexAttribArray(boxPositionAttrib);
        GLES20.glEnableVertexAttribArray(boxNormalAttrib);

        float alpha = isDummy ? 0.5f : 1.0f;

        // Draw levels (gray shelves)
        for (ShelfLevel l : levels) {
            float[] objMat = new float[16];
            Matrix.setIdentityM(objMat, 0);
            
            // Translate: anchor is bottom-left-front. Move to center of this level box.
            float tx = (l.width / 2f) * displayScale;
            float ty = (l.yOffset + l.thickness / 2f) * displayScale;
            float tz = (-l.depth / 2f) * displayScale; // AR -Z is forward

            Matrix.translateM(objMat, 0, tx, ty, tz);
            Matrix.scaleM(objMat, 0, l.width * displayScale, l.thickness * displayScale, l.depth * displayScale);

            float[] finalModelMat = new float[16];
            Matrix.multiplyMM(finalModelMat, 0, modelMatrix, 0, objMat, 0);
            Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, finalModelMat, 0);

            GLES20.glUniformMatrix4fv(boxMvpUniform, 1, false, mvpMatrix, 0);
            GLES20.glUniform4f(boxColorUniform, 0.4f, 0.4f, 0.4f, alpha); // Darker Gray for shelf
            GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 36);
        }

        // Draw products
        for (ProductBox p : products) {
            float[] objMat = new float[16];
            Matrix.setIdentityM(objMat, 0);

            float tx = (p.x + p.width / 2f) * displayScale;
            float ty = (p.y + p.height / 2f + 0.04f) * displayScale; // Add level thickness offset
            float tz = (p.z - p.depth / 2f) * displayScale;

            Matrix.translateM(objMat, 0, tx, ty, tz);
            Matrix.scaleM(objMat, 0, p.width * displayScale, p.height * displayScale, p.depth * displayScale);

            float[] finalModelMat = new float[16];
            Matrix.multiplyMM(finalModelMat, 0, modelMatrix, 0, objMat, 0);
            Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, finalModelMat, 0);

            GLES20.glUniformMatrix4fv(boxMvpUniform, 1, false, mvpMatrix, 0);
            
            // Draw solid face
            GLES20.glUniform4f(boxColorUniform, p.color[0], p.color[1], p.color[2], p.color[3] * alpha);
            GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 36);

            // Draw wireframe edges in slightly darker color or black for contrast
            GLES20.glLineWidth(3.0f);
            GLES20.glUniform4f(boxColorUniform, 0.0f, 0.0f, 0.0f, 0.6f * alpha);
            GLES20.glDrawElements(GLES20.GL_LINES, CUBE_EDGES.length, GLES20.GL_UNSIGNED_SHORT, cubeEdgeBuffer);
        }

        GLES20.glDisableVertexAttribArray(boxPositionAttrib);
        GLES20.glDisableVertexAttribArray(boxNormalAttrib);
    }

    private void handleTap(Frame frame, Activity activity) {
        if (shelfAnchor != null) return; // Only place one shelf

        List<HitResult> hits = frame.hitTest(tapX, tapY);
        for (HitResult hit : hits) {
            if (hit.getTrackable() instanceof Plane) {
                Plane p = (Plane) hit.getTrackable();
                if (p.isPoseInPolygon(hit.getHitPose()) && p.getTrackingState() == TrackingState.TRACKING) {
                    shelfAnchor = hit.createAnchor();
                    
                    Vibrator vib = (Vibrator) activity.getSystemService(Activity.VIBRATOR_SERVICE);
                    if (vib != null && vib.hasVibrator()) {
                        vib.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
                    }

                    activity.runOnUiThread(() -> {
                        if (statusText != null) statusText.setText("Shelf anchored in AR.");
                        if (shelfOverlay != null) shelfOverlay.setAnchored(true);
                    });
                    return;
                }
            }
        }
    }

    private float[] worldToScreen(float[] world) {
        float[] clip = new float[4];
        clip[0] = vpMatrix[0]*world[0] + vpMatrix[4]*world[1] + vpMatrix[8]*world[2] + vpMatrix[12]*world[3];
        clip[1] = vpMatrix[1]*world[0] + vpMatrix[5]*world[1] + vpMatrix[9]*world[2] + vpMatrix[13]*world[3];
        clip[2] = vpMatrix[2]*world[0] + vpMatrix[6]*world[1] + vpMatrix[10]*world[2] + vpMatrix[14]*world[3];
        clip[3] = vpMatrix[3]*world[0] + vpMatrix[7]*world[1] + vpMatrix[11]*world[2] + vpMatrix[15]*world[3];

        if (clip[3] == 0 || clip[3] < 0) return null; // Behind camera

        float ndcX = clip[0] / clip[3];
        float ndcY = clip[1] / clip[3];

        float screenX = (ndcX + 1f) / 2f * viewWidth;
        float screenY = (1f - ndcY) / 2f * viewHeight;

        return new float[]{screenX, screenY};
    }

    private int loadProgram(String vs, String fs) {
        int v = GLES20.glCreateShader(GLES20.GL_VERTEX_SHADER);
        GLES20.glShaderSource(v, vs);
        GLES20.glCompileShader(v);

        int f = GLES20.glCreateShader(GLES20.GL_FRAGMENT_SHADER);
        GLES20.glShaderSource(f, fs);
        GLES20.glCompileShader(f);

        int p = GLES20.glCreateProgram();
        GLES20.glAttachShader(p, v);
        GLES20.glAttachShader(p, f);
        GLES20.glLinkProgram(p);
        return p;
    }
}
