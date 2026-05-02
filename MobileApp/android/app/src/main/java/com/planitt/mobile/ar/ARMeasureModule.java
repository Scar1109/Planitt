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
import com.google.ar.core.exceptions.CameraNotAvailableException;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;

import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/**
 * Combined AR Module + Renderer that runs ARCore directly inside the
 * existing React Native Activity (no separate Activity needed).
 * Includes iOS Measure-style visual overlays.
 */
public class ARMeasureModule extends ReactContextBaseJavaModule implements GLSurfaceView.Renderer {
    private static final String TAG = "ARMeasureNative";
    private static final int CAMERA_PERMISSION_CODE = 7002;

    private Promise measurePromise;
    private Session arSession;
    private GLSurfaceView glSurfaceView;
    private FrameLayout arOverlay;
    private MeasureOverlayView measureOverlay;
    private TextView statusText;
    private TextView distanceText;
    private Button confirmButton;

    private int cameraTextureId = -1;
    private boolean sessionConfigured = false;
    private volatile boolean sessionResumed = false;
    private int viewWidth, viewHeight;

    private final List<Anchor> anchors = new ArrayList<>();
    private double measuredDistanceCm = -1;
    private volatile boolean pendingTap = false;
    private float tapX, tapY;

    private int backgroundProgram;
    private int backgroundPositionAttrib;
    private int backgroundTexCoordAttrib;

    // Matrices for 3D→2D projection
    private final float[] viewMatrix = new float[16];
    private final float[] projMatrix = new float[16];
    private final float[] vpMatrix = new float[16];

    private static final String VS =
            "attribute vec4 a_Position;\n" +
            "attribute vec2 a_TexCoord;\n" +
            "varying vec2 v_TexCoord;\n" +
            "void main() {\n" +
            "  gl_Position = a_Position;\n" +
            "  v_TexCoord = a_TexCoord;\n" +
            "}";

    private static final String FS =
            "#extension GL_OES_EGL_image_external : require\n" +
            "precision mediump float;\n" +
            "varying vec2 v_TexCoord;\n" +
            "uniform samplerExternalOES u_Texture;\n" +
            "void main() {\n" +
            "  gl_FragColor = texture2D(u_Texture, v_TexCoord);\n" +
            "}";

    private static final float[] QUAD = {
            -1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f
    };
    private float[] texCoords = {0f, 1f, 1f, 1f, 0f, 0f, 1f, 0f};

    public ARMeasureModule(ReactApplicationContext ctx) {
        super(ctx);
    }

    @Override
    public String getName() {
        return "ARMeasureModule";
    }

    @ReactMethod
    public void startMeasurement(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity");
            return;
        }

        Log.i(TAG, "startMeasurement called");
        measurePromise = promise;

        activity.runOnUiThread(() -> {
            try {
                // Check camera permission
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    Log.i(TAG, "Requesting camera permission...");
                    ActivityCompat.requestPermissions(activity,
                            new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_CODE);
                    rejectPromise("PERMISSION_NEEDED", "Camera permission required. Please try again.");
                    return;
                }

                // Check ARCore
                ArCoreApk.Availability avail =
                        ArCoreApk.getInstance().checkAvailability(activity);
                Log.i(TAG, "ARCore availability: " + avail);

                if (avail == ArCoreApk.Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE) {
                    rejectPromise("UNSUPPORTED", "Device does not support AR.");
                    return;
                }

                ArCoreApk.InstallStatus installStatus =
                        ArCoreApk.getInstance().requestInstall(activity, true);
                if (installStatus != ArCoreApk.InstallStatus.INSTALLED) {
                    rejectPromise("NOT_INSTALLED", "ARCore installation required.");
                    return;
                }

                // Create session
                arSession = new Session(activity);
                Config config = new Config(arSession);
                config.setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL);
                config.setUpdateMode(Config.UpdateMode.LATEST_CAMERA_IMAGE);
                config.setFocusMode(Config.FocusMode.AUTO);
                if (arSession.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                    config.setDepthMode(Config.DepthMode.AUTOMATIC);
                }
                arSession.configure(config);
                Log.i(TAG, "Session created and configured");

                showAROverlay(activity);

            } catch (Exception e) {
                Log.e(TAG, "Failed to start AR", e);
                rejectPromise("AR_ERROR", "AR init failed: " + e);
            }
        });
    }

    // ===================== AR OVERLAY UI =====================

    private void showAROverlay(Activity activity) {
        arOverlay = new FrameLayout(activity);
        arOverlay.setBackgroundColor(Color.BLACK);

        // GL surface
        glSurfaceView = new GLSurfaceView(activity);
        glSurfaceView.setPreserveEGLContextOnPause(true);
        glSurfaceView.setEGLContextClientVersion(2);
        glSurfaceView.setEGLConfigChooser(8, 8, 8, 8, 16, 0);
        glSurfaceView.setRenderer(this);
        glSurfaceView.setRenderMode(GLSurfaceView.RENDERMODE_CONTINUOUSLY);
        arOverlay.addView(glSurfaceView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // iOS-style measure overlay (crosshair, dots, lines)
        measureOverlay = new MeasureOverlayView(activity);
        arOverlay.addView(measureOverlay, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // UI controls layer
        LinearLayout ui = new LinearLayout(activity);
        ui.setOrientation(LinearLayout.VERTICAL);
        ui.setPadding(48, 100, 48, 60);

        // Top bar with close button
        LinearLayout topBar = new LinearLayout(activity);
        topBar.setGravity(Gravity.START);
        topBar.setPadding(0, 0, 0, 0);

        Button closeBtn = new Button(activity);
        closeBtn.setText("✕ Close");
        closeBtn.setBackgroundColor(0x60000000);
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(14);
        closeBtn.setPadding(36, 16, 36, 16);
        closeBtn.setOnClickListener(v -> closeAR(-1));
        topBar.addView(closeBtn);
        ui.addView(topBar);

        // Spacer pushes bottom controls down
        ui.addView(new View(activity), new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f));

        // Status text
        statusText = new TextView(activity);
        statusText.setTextColor(Color.WHITE);
        statusText.setTextSize(15);
        statusText.setGravity(Gravity.CENTER);
        statusText.setBackgroundColor(0xAA1A1A2E);
        statusText.setPadding(32, 20, 32, 20);
        statusText.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        statusText.setText("Starting AR camera...");
        ui.addView(statusText);

        // Distance display (large, prominent)
        distanceText = new TextView(activity);
        distanceText.setTextColor(0xFF06D6A0);
        distanceText.setTextSize(32);
        distanceText.setGravity(Gravity.CENTER);
        distanceText.setPadding(16, 12, 16, 12);
        distanceText.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        distanceText.setVisibility(View.GONE);
        ui.addView(distanceText);

        // Button row
        LinearLayout btnRow = new LinearLayout(activity);
        btnRow.setGravity(Gravity.CENTER);
        btnRow.setPadding(0, 16, 0, 0);

        Button resetBtn = new Button(activity);
        resetBtn.setText("↺ Reset");
        resetBtn.setBackgroundColor(0x60FFFFFF);
        resetBtn.setTextColor(0xFF333333);
        resetBtn.setTextSize(14);
        resetBtn.setPadding(52, 20, 52, 20);
        resetBtn.setOnClickListener(v -> resetMeasurement());
        btnRow.addView(resetBtn);

        btnRow.addView(new View(activity), new LinearLayout.LayoutParams(24, 1));

        confirmButton = new Button(activity);
        confirmButton.setText("✓ Confirm");
        confirmButton.setBackgroundColor(0xFF06D6A0);
        confirmButton.setTextColor(Color.WHITE);
        confirmButton.setTextSize(14);
        confirmButton.setPadding(52, 20, 52, 20);
        confirmButton.setEnabled(false);
        confirmButton.setAlpha(0.5f);
        confirmButton.setOnClickListener(v -> closeAR(measuredDistanceCm));
        btnRow.addView(confirmButton);
        ui.addView(btnRow);

        arOverlay.addView(ui, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // Touch handler
        glSurfaceView.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN && anchors.size() < 2) {
                pendingTap = true;
                tapX = event.getX();
                tapY = event.getY();
            }
            return true;
        });

        // Add to root
        ViewGroup root = (ViewGroup) activity.getWindow().getDecorView().getRootView();
        root.addView(arOverlay, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Resume session
        try {
            arSession.resume();
            sessionResumed = true;
            Log.i(TAG, "Session RESUMED OK ✓");
        } catch (CameraNotAvailableException e) {
            Log.e(TAG, "Camera not available", e);
            removeOverlayAndReject("Camera not available. Close other camera apps.");
        } catch (Exception e) {
            Log.e(TAG, "Session resume failed", e);
            removeOverlayAndReject("AR resume failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
    }

    // ===================== CLOSE / CLEANUP =====================

    private void closeAR(double result) {
        Log.i(TAG, "closeAR: result=" + result);
        sessionResumed = false;

        Activity activity = getCurrentActivity();

        if (arSession != null) {
            arSession.pause();
            arSession.close();
            arSession = null;
        }

        for (Anchor a : anchors) a.detach();
        anchors.clear();
        measuredDistanceCm = -1;
        sessionConfigured = false;

        if (activity != null && arOverlay != null) {
            activity.runOnUiThread(() -> {
                if (measureOverlay != null) measureOverlay.stopAnimations();
                ViewGroup root = (ViewGroup) activity.getWindow().getDecorView().getRootView();
                root.removeView(arOverlay);
                arOverlay = null;
                glSurfaceView = null;
                measureOverlay = null;
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        if (measurePromise != null) {
            measurePromise.resolve(result);
            measurePromise = null;
        }
    }

    private void removeOverlayAndReject(String error) {
        sessionResumed = false;
        if (arSession != null) {
            try { arSession.pause(); } catch (Exception ignored) {}
            arSession.close();
            arSession = null;
        }

        Activity activity = getCurrentActivity();
        if (activity != null && arOverlay != null) {
            activity.runOnUiThread(() -> {
                if (measureOverlay != null) measureOverlay.stopAnimations();
                ViewGroup root = (ViewGroup) activity.getWindow().getDecorView().getRootView();
                root.removeView(arOverlay);
                arOverlay = null;
                glSurfaceView = null;
                measureOverlay = null;
            });
        }

        rejectPromise("AR_ERROR", error);
    }

    private void rejectPromise(String code, String message) {
        if (measurePromise != null) {
            measurePromise.reject(code, message);
            measurePromise = null;
        }
    }

    // ===================== GL RENDERER =====================

    @Override
    public void onSurfaceCreated(GL10 gl, EGLConfig config) {
        Log.i(TAG, "onSurfaceCreated");
        GLES20.glClearColor(0f, 0f, 0f, 1f);

        int[] tex = new int[1];
        GLES20.glGenTextures(1, tex, 0);
        cameraTextureId = tex[0];
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTextureId);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);

        int vs = loadShader(GLES20.GL_VERTEX_SHADER, VS);
        int fs = loadShader(GLES20.GL_FRAGMENT_SHADER, FS);
        backgroundProgram = GLES20.glCreateProgram();
        GLES20.glAttachShader(backgroundProgram, vs);
        GLES20.glAttachShader(backgroundProgram, fs);
        GLES20.glLinkProgram(backgroundProgram);
        backgroundPositionAttrib = GLES20.glGetAttribLocation(backgroundProgram, "a_Position");
        backgroundTexCoordAttrib = GLES20.glGetAttribLocation(backgroundProgram, "a_TexCoord");
        Log.i(TAG, "Shaders ready");
    }

    @Override
    public void onSurfaceChanged(GL10 gl, int w, int h) {
        viewWidth = w;
        viewHeight = h;
        GLES20.glViewport(0, 0, w, h);
        if (arSession != null) {
            Activity a = getCurrentActivity();
            if (a != null) {
                arSession.setDisplayGeometry(
                        a.getWindowManager().getDefaultDisplay().getRotation(), w, h);
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
                    FloatBuffer.wrap(QUAD),
                    com.google.ar.core.Coordinates2d.TEXTURE_NORMALIZED,
                    FloatBuffer.wrap(texCoords));
        }

        drawBackground();

        Camera cam = frame.getCamera();
        TrackingState state = cam.getTrackingState();

        Activity activity = getCurrentActivity();
        if (activity == null) return;

        if (state == TrackingState.TRACKING) {
            // Get view/projection matrices for 3D→2D projection
            cam.getViewMatrix(viewMatrix, 0);
            cam.getProjectionMatrix(projMatrix, 0, 0.1f, 100f);
            Matrix.multiplyMM(vpMatrix, 0, projMatrix, 0, viewMatrix, 0);

            // Project anchor positions to screen coordinates
            final float[] screen1 = (anchors.size() >= 1) ?
                    worldToScreen(anchors.get(0).getPose()) : null;
            final float[] screen2 = (anchors.size() >= 2) ?
                    worldToScreen(anchors.get(1).getPose()) : null;

            activity.runOnUiThread(() -> {
                if (measureOverlay == null) return;
                measureOverlay.setTracking(true);

                if (screen1 != null) {
                    measureOverlay.setAnchor1(screen1[0], screen1[1]);
                }
                if (screen2 != null) {
                    measureOverlay.setAnchor2(screen2[0], screen2[1]);
                    measureOverlay.setDistanceLabel(
                            String.format("%.1f cm", measuredDistanceCm));
                }

                if (anchors.isEmpty()) {
                    statusText.setText("Tap two points on the shelf to measure.");
                }
            });

            if (pendingTap) {
                pendingTap = false;
                handleTap(frame, activity);
            }
        } else if (state == TrackingState.PAUSED) {
            activity.runOnUiThread(() -> {
                if (measureOverlay != null) measureOverlay.setTracking(false);
                if (statusText != null) statusText.setText("Move slowly, scanning the surface...");
            });
        }
    }

    /**
     * Projects a 3D world-space Pose to 2D screen coordinates.
     */
    private float[] worldToScreen(Pose pose) {
        float[] world = {pose.tx(), pose.ty(), pose.tz(), 1f};
        float[] clip = new float[4];

        // Multiply by view-projection matrix
        clip[0] = vpMatrix[0]*world[0] + vpMatrix[4]*world[1] + vpMatrix[8]*world[2] + vpMatrix[12]*world[3];
        clip[1] = vpMatrix[1]*world[0] + vpMatrix[5]*world[1] + vpMatrix[9]*world[2] + vpMatrix[13]*world[3];
        clip[2] = vpMatrix[2]*world[0] + vpMatrix[6]*world[1] + vpMatrix[10]*world[2] + vpMatrix[14]*world[3];
        clip[3] = vpMatrix[3]*world[0] + vpMatrix[7]*world[1] + vpMatrix[11]*world[2] + vpMatrix[15]*world[3];

        if (clip[3] == 0) return new float[]{-1, -1};

        // NDC
        float ndcX = clip[0] / clip[3];
        float ndcY = clip[1] / clip[3];

        // Screen coordinates (flip Y because screen Y is top-down)
        float screenX = (ndcX + 1f) / 2f * viewWidth;
        float screenY = (1f - ndcY) / 2f * viewHeight;

        return new float[]{screenX, screenY};
    }

    private void drawBackground() {
        GLES20.glDepthMask(false);
        GLES20.glUseProgram(backgroundProgram);

        FloatBuffer vb = ByteBuffer.allocateDirect(QUAD.length * 4)
                .order(ByteOrder.nativeOrder()).asFloatBuffer();
        vb.put(QUAD).position(0);

        FloatBuffer tb = ByteBuffer.allocateDirect(texCoords.length * 4)
                .order(ByteOrder.nativeOrder()).asFloatBuffer();
        tb.put(texCoords).position(0);

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

    // ===================== MEASUREMENT =====================

    private void handleTap(Frame frame, Activity activity) {
        List<HitResult> hits = frame.hitTest(tapX, tapY);
        for (HitResult hit : hits) {
            if (hit.getTrackable() instanceof Plane) {
                Plane p = (Plane) hit.getTrackable();
                if (p.isPoseInPolygon(hit.getHitPose()) &&
                    p.getTrackingState() == TrackingState.TRACKING) {
                    placeAnchor(hit, activity);
                    return;
                }
            }
        }
        if (!hits.isEmpty()) {
            placeAnchor(hits.get(0), activity);
        } else {
            activity.runOnUiThread(() -> {
                if (statusText != null)
                    statusText.setText("No surface found. Try tapping elsewhere.");
            });
        }
    }

    private void placeAnchor(HitResult hit, Activity activity) {
        Anchor anchor = hit.createAnchor();
        anchors.add(anchor);
        Log.i(TAG, "Anchor #" + anchors.size() + " placed");

        Vibrator vib = (Vibrator) activity.getSystemService(Activity.VIBRATOR_SERVICE);
        if (vib != null && vib.hasVibrator()) {
            vib.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
        }

        if (anchors.size() == 1) {
            activity.runOnUiThread(() -> {
                if (statusText != null) statusText.setText("First point set ✓  Tap the second point.");
            });
        } else if (anchors.size() == 2) {
            Pose p1 = anchors.get(0).getPose();
            Pose p2 = anchors.get(1).getPose();
            float dx = p1.tx() - p2.tx();
            float dy = p1.ty() - p2.ty();
            float dz = p1.tz() - p2.tz();
            measuredDistanceCm = Math.sqrt(dx * dx + dy * dy + dz * dz) * 100.0;
            Log.i(TAG, "Distance: " + measuredDistanceCm + " cm");

            if (vib != null) {
                vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 40, 60, 40}, -1));
            }

            activity.runOnUiThread(() -> {
                if (distanceText != null) {
                    distanceText.setText(String.format("%.1f cm", measuredDistanceCm));
                    distanceText.setVisibility(View.VISIBLE);
                }
                if (statusText != null) statusText.setText("Measurement done ✓  Confirm or reset.");
                if (confirmButton != null) {
                    confirmButton.setEnabled(true);
                    confirmButton.setAlpha(1.0f);
                }
            });
        }
    }

    private void resetMeasurement() {
        for (Anchor a : anchors) a.detach();
        anchors.clear();
        measuredDistanceCm = -1;
        if (distanceText != null) distanceText.setVisibility(View.GONE);
        if (confirmButton != null) {
            confirmButton.setEnabled(false);
            confirmButton.setAlpha(0.5f);
        }
        if (statusText != null) statusText.setText("Tap two points on the shelf to measure.");
        if (measureOverlay != null) measureOverlay.clearAnchors();
    }

    private int loadShader(int type, String code) {
        int s = GLES20.glCreateShader(type);
        GLES20.glShaderSource(s, code);
        GLES20.glCompileShader(s);
        return s;
    }
}
