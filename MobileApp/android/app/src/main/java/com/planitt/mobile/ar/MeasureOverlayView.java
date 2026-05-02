package com.planitt.mobile.ar;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.view.View;
import android.view.animation.LinearInterpolator;

/**
 * iOS Measure-style visual overlay drawn on top of the AR camera feed.
 * Renders: center crosshair, scanning dot grid, anchor markers,
 * measurement line, and distance label.
 */
public class MeasureOverlayView extends View {

    // Anchor screen positions (set from GL thread projection)
    private float[] anchorScreen1 = null;  // {x, y}
    private float[] anchorScreen2 = null;
    private String distanceLabel = null;
    private boolean isTracking = false;

    // Animation
    private float scanPhase = 0f;
    private float pulsePhase = 0f;
    private ValueAnimator scanAnimator;
    private ValueAnimator pulseAnimator;

    // Paints
    private final Paint crosshairPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint crosshairCirclePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint anchorPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint anchorGlowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint anchorStrokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint lineGlowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint scanLinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    // Colors
    private static final int ACCENT = 0xFF06D6A0;       // Mint green
    private static final int ACCENT_GLOW = 0x4006D6A0;
    private static final int CROSSHAIR_COLOR = 0xDDFFFFFF;
    private static final int DOT_COLOR = 0x55FFFFFF;
    private static final int LINE_COLOR = 0xFFFFD166;     // Warm yellow
    private static final int LINE_GLOW_COLOR = 0x40FFD166;

    public MeasureOverlayView(Context context) {
        super(context);
        setWillNotDraw(false);
        initPaints();
        startAnimations();
    }

    private void initPaints() {
        // Center crosshair
        crosshairPaint.setColor(CROSSHAIR_COLOR);
        crosshairPaint.setStrokeWidth(2.5f);
        crosshairPaint.setStyle(Paint.Style.STROKE);

        crosshairCirclePaint.setColor(CROSSHAIR_COLOR);
        crosshairCirclePaint.setStrokeWidth(1.5f);
        crosshairCirclePaint.setStyle(Paint.Style.STROKE);

        // Scanning dots
        dotPaint.setColor(DOT_COLOR);
        dotPaint.setStyle(Paint.Style.FILL);

        // Anchor markers
        anchorPaint.setColor(ACCENT);
        anchorPaint.setStyle(Paint.Style.FILL);

        anchorGlowPaint.setColor(ACCENT_GLOW);
        anchorGlowPaint.setStyle(Paint.Style.FILL);

        anchorStrokePaint.setColor(0xFFFFFFFF);
        anchorStrokePaint.setStrokeWidth(3f);
        anchorStrokePaint.setStyle(Paint.Style.STROKE);

        // Measurement line
        linePaint.setColor(LINE_COLOR);
        linePaint.setStrokeWidth(4f);
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setStrokeCap(Paint.Cap.ROUND);

        lineGlowPaint.setColor(LINE_GLOW_COLOR);
        lineGlowPaint.setStrokeWidth(12f);
        lineGlowPaint.setStyle(Paint.Style.STROKE);
        lineGlowPaint.setStrokeCap(Paint.Cap.ROUND);

        // Distance label
        labelBgPaint.setColor(0xDD1A1A2E);
        labelBgPaint.setStyle(Paint.Style.FILL);

        labelTextPaint.setColor(Color.WHITE);
        labelTextPaint.setTextSize(48f);
        labelTextPaint.setTextAlign(Paint.Align.CENTER);
        labelTextPaint.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));

        // Scanning line
        scanLinePaint.setColor(0x3006D6A0);
        scanLinePaint.setStrokeWidth(2f);
        scanLinePaint.setStyle(Paint.Style.STROKE);
    }

    private void startAnimations() {
        // Scanning dot phase animation
        scanAnimator = ValueAnimator.ofFloat(0f, 1f);
        scanAnimator.setDuration(3000);
        scanAnimator.setRepeatCount(ValueAnimator.INFINITE);
        scanAnimator.setInterpolator(new LinearInterpolator());
        scanAnimator.addUpdateListener(a -> {
            scanPhase = (float) a.getAnimatedValue();
            postInvalidateOnAnimation();
        });
        scanAnimator.start();

        // Pulse animation for anchors
        pulseAnimator = ValueAnimator.ofFloat(0f, 1f);
        pulseAnimator.setDuration(1500);
        pulseAnimator.setRepeatCount(ValueAnimator.INFINITE);
        pulseAnimator.setInterpolator(new LinearInterpolator());
        pulseAnimator.addUpdateListener(a -> {
            pulsePhase = (float) a.getAnimatedValue();
        });
        pulseAnimator.start();
    }

    public void stopAnimations() {
        if (scanAnimator != null) scanAnimator.cancel();
        if (pulseAnimator != null) pulseAnimator.cancel();
    }

    // ---- Public setters (called from GL thread via runOnUiThread) ----

    public void setAnchor1(float x, float y) {
        anchorScreen1 = new float[]{x, y};
    }

    public void setAnchor2(float x, float y) {
        anchorScreen2 = new float[]{x, y};
    }

    public void setDistanceLabel(String label) {
        distanceLabel = label;
    }

    public void setTracking(boolean tracking) {
        isTracking = tracking;
    }

    public void clearAnchors() {
        anchorScreen1 = null;
        anchorScreen2 = null;
        distanceLabel = null;
    }

    // ---- Drawing ----

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();
        float cx = w / 2f;
        float cy = h / 2f;

        // 1. Draw scanning dot grid (only when tracking & no anchors yet)
        if (isTracking && anchorScreen1 == null) {
            drawScanningDots(canvas, w, h);
        }

        // 2. Draw center crosshair
        drawCrosshair(canvas, cx, cy);

        // 3. Draw anchor markers
        if (anchorScreen1 != null) {
            drawAnchorMarker(canvas, anchorScreen1[0], anchorScreen1[1]);
        }
        if (anchorScreen2 != null) {
            drawAnchorMarker(canvas, anchorScreen2[0], anchorScreen2[1]);
        }

        // 4. Draw measurement line between anchors
        if (anchorScreen1 != null && anchorScreen2 != null) {
            drawMeasurementLine(canvas, anchorScreen1, anchorScreen2);
            drawDistanceLabel(canvas, anchorScreen1, anchorScreen2);
        }
    }

    private void drawCrosshair(Canvas canvas, float cx, float cy) {
        float size = 28f;
        float gap = 8f;

        // Center dot
        Paint dotP = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotP.setColor(CROSSHAIR_COLOR);
        dotP.setStyle(Paint.Style.FILL);
        canvas.drawCircle(cx, cy, 3f, dotP);

        // Cross lines with gap
        canvas.drawLine(cx - size, cy, cx - gap, cy, crosshairPaint);
        canvas.drawLine(cx + gap, cy, cx + size, cy, crosshairPaint);
        canvas.drawLine(cx, cy - size, cx, cy - gap, crosshairPaint);
        canvas.drawLine(cx, cy + gap, cx, cy + size, crosshairPaint);

        // Outer circle
        float radius = 22f;
        crosshairCirclePaint.setAlpha((int) (80 + 40 * Math.sin(pulsePhase * Math.PI * 2)));
        canvas.drawCircle(cx, cy, radius, crosshairCirclePaint);
    }

    private void drawScanningDots(Canvas canvas, int w, int h) {
        float spacing = 56f;
        float dotRadius = 2.2f;
        float offsetY = scanPhase * spacing;

        for (float x = spacing / 2; x < w; x += spacing) {
            for (float y = -spacing + offsetY; y < h + spacing; y += spacing) {
                // Distance from center for fading
                float dx = x - w / 2f;
                float dy = y - h / 2f;
                float dist = (float) Math.sqrt(dx * dx + dy * dy);
                float maxDist = (float) Math.sqrt(w * w + h * h) / 2f;
                float alpha = Math.max(0, 1f - dist / maxDist);
                alpha *= 0.4f;

                // Wave effect
                float wave = (float) Math.sin((x + y) * 0.02f + scanPhase * Math.PI * 4);
                alpha *= 0.6f + 0.4f * wave;

                dotPaint.setAlpha((int) (alpha * 255));
                canvas.drawCircle(x, y, dotRadius, dotPaint);
            }
        }

        // Scanning horizontal line
        float lineY = h * scanPhase;
        scanLinePaint.setAlpha(60);
        canvas.drawLine(0, lineY, w, lineY, scanLinePaint);
    }

    private void drawAnchorMarker(Canvas canvas, float x, float y) {
        // Pulsing glow ring
        float pulseRadius = 28f + 12f * (float) Math.sin(pulsePhase * Math.PI * 2);
        int glowAlpha = (int) (40 + 30 * Math.sin(pulsePhase * Math.PI * 2));
        anchorGlowPaint.setAlpha(glowAlpha);
        canvas.drawCircle(x, y, pulseRadius, anchorGlowPaint);

        // Outer white ring
        canvas.drawCircle(x, y, 16f, anchorStrokePaint);

        // Inner filled circle
        canvas.drawCircle(x, y, 12f, anchorPaint);

        // Center bright dot
        Paint brightDot = new Paint(Paint.ANTI_ALIAS_FLAG);
        brightDot.setColor(Color.WHITE);
        brightDot.setStyle(Paint.Style.FILL);
        canvas.drawCircle(x, y, 4f, brightDot);
    }

    private void drawMeasurementLine(Canvas canvas, float[] p1, float[] p2) {
        // Glow
        canvas.drawLine(p1[0], p1[1], p2[0], p2[1], lineGlowPaint);
        // Main line
        canvas.drawLine(p1[0], p1[1], p2[0], p2[1], linePaint);

        // Dashed endpoint lines (perpendicular marks like a ruler)
        float dx = p2[0] - p1[0];
        float dy = p2[1] - p1[1];
        float len = (float) Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        float nx = -dy / len * 20f;  // perpendicular
        float ny = dx / len * 20f;

        Paint endPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        endPaint.setColor(LINE_COLOR);
        endPaint.setStrokeWidth(2.5f);
        endPaint.setStyle(Paint.Style.STROKE);

        canvas.drawLine(p1[0] - nx, p1[1] - ny, p1[0] + nx, p1[1] + ny, endPaint);
        canvas.drawLine(p2[0] - nx, p2[1] - ny, p2[0] + nx, p2[1] + ny, endPaint);
    }

    private void drawDistanceLabel(Canvas canvas, float[] p1, float[] p2) {
        if (distanceLabel == null) return;

        float midX = (p1[0] + p2[0]) / 2f;
        float midY = (p1[1] + p2[1]) / 2f;

        // Measure text
        float textW = labelTextPaint.measureText(distanceLabel);
        float padH = 28f;
        float padV = 16f;
        float boxW = textW + padH * 2;
        float boxH = 60f + padV;

        // Background rounded rect
        RectF bg = new RectF(
                midX - boxW / 2, midY - boxH - 20,
                midX + boxW / 2, midY - 20);

        // Shadow
        Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadowPaint.setColor(0x40000000);
        shadowPaint.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(new RectF(bg.left + 2, bg.top + 3, bg.right + 2, bg.bottom + 3),
                16f, 16f, shadowPaint);

        // Background
        canvas.drawRoundRect(bg, 16f, 16f, labelBgPaint);

        // Border
        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setColor(0x40FFFFFF);
        borderPaint.setStrokeWidth(1.5f);
        borderPaint.setStyle(Paint.Style.STROKE);
        canvas.drawRoundRect(bg, 16f, 16f, borderPaint);

        // Text
        float textY = bg.centerY() + labelTextPaint.getTextSize() / 3f;
        canvas.drawText(distanceLabel, midX, textY, labelTextPaint);
    }
}
