package com.planitt.mobile.ar;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.view.View;
import android.view.animation.LinearInterpolator;

public class ShelfOverlayView extends View {

    private boolean isTracking = false;
    private boolean isAnchored = false;

    // Animation
    private float scanPhase = 0f;
    private ValueAnimator scanAnimator;

    // Paints
    private final Paint crosshairPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint crosshairCirclePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint scanLinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    // Selected Product Info
    private String selectedProductName = null;
    private String selectedProductSku = null;
    private float[] selectedProductScreenPos = null; // {x, y}

    // Colors
    private static final int CROSSHAIR_COLOR = 0xDDFFFFFF;
    private static final int DOT_COLOR = 0x55FFFFFF;
    private static final int ACCENT = 0xFF06D6A0;

    public ShelfOverlayView(Context context) {
        super(context);
        setWillNotDraw(false);
        initPaints();
        startAnimations();
    }

    private void initPaints() {
        crosshairPaint.setColor(CROSSHAIR_COLOR);
        crosshairPaint.setStrokeWidth(2.5f);
        crosshairPaint.setStyle(Paint.Style.STROKE);

        crosshairCirclePaint.setColor(CROSSHAIR_COLOR);
        crosshairCirclePaint.setStrokeWidth(1.5f);
        crosshairCirclePaint.setStyle(Paint.Style.STROKE);

        dotPaint.setColor(DOT_COLOR);
        dotPaint.setStyle(Paint.Style.FILL);

        scanLinePaint.setColor(0x3006D6A0);
        scanLinePaint.setStrokeWidth(2f);
        scanLinePaint.setStyle(Paint.Style.STROKE);
    }

    private void startAnimations() {
        scanAnimator = ValueAnimator.ofFloat(0f, 1f);
        scanAnimator.setDuration(3000);
        scanAnimator.setRepeatCount(ValueAnimator.INFINITE);
        scanAnimator.setInterpolator(new LinearInterpolator());
        scanAnimator.addUpdateListener(a -> {
            scanPhase = (float) a.getAnimatedValue();
            postInvalidateOnAnimation();
        });
        scanAnimator.start();
    }

    public void stopAnimations() {
        if (scanAnimator != null) scanAnimator.cancel();
    }

    public void setTracking(boolean tracking) {
        isTracking = tracking;
        postInvalidate();
    }

    public void setAnchored(boolean anchored) {
        isAnchored = anchored;
        postInvalidate();
    }

    public void setSelectedProduct(String name, String sku, float x, float y) {
        selectedProductName = name;
        selectedProductSku = sku;
        if (name != null && sku != null) {
            selectedProductScreenPos = new float[]{x, y};
        } else {
            selectedProductScreenPos = null;
        }
        postInvalidate();
    }

    public static class ProductLabel {
        public String name;
        public float x;
        public float y;
        public boolean isVisible;
        public ProductLabel(String name, float x, float y, boolean isVisible) {
            this.name = name;
            this.x = x;
            this.y = y;
            this.isVisible = isVisible;
        }
    }

    private java.util.List<ProductLabel> productLabels = new java.util.ArrayList<>();

    public void setProducts(java.util.List<ProductLabel> labels) {
        this.productLabels = labels;
        postInvalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();
        float cx = w / 2f;
        float cy = h / 2f;

        if (isTracking && !isAnchored) {
            drawScanningDots(canvas, w, h);
            drawCrosshair(canvas, cx, cy);
        }

        if (isAnchored) {
            if (selectedProductName != null && selectedProductScreenPos != null) {
                // Main shelf tag
                drawProductLabel(canvas, selectedProductScreenPos[0], selectedProductScreenPos[1], selectedProductName, selectedProductSku);
            }

            // Draw individual product names
            Paint namePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            namePaint.setColor(Color.WHITE);
            namePaint.setTextSize(20f);
            namePaint.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
            namePaint.setTextAlign(Paint.Align.CENTER);

            Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            shadowPaint.setColor(0xBB000000);
            shadowPaint.setStyle(Paint.Style.FILL);

            for (ProductLabel label : productLabels) {
                if (label.isVisible) {
                    float textW = namePaint.measureText(label.name);
                    RectF bg = new RectF(label.x - textW / 2 - 8, label.y - 12 - 12, label.x + textW / 2 + 8, label.y + 12 - 12);
                    canvas.drawRoundRect(bg, 8f, 8f, shadowPaint);
                    canvas.drawText(label.name, label.x, label.y - 12 + (namePaint.getTextSize() / 3f), namePaint);
                }
            }
        }
    }

    private void drawCrosshair(Canvas canvas, float cx, float cy) {
        float size = 28f;
        float gap = 8f;

        Paint dotP = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotP.setColor(CROSSHAIR_COLOR);
        dotP.setStyle(Paint.Style.FILL);
        canvas.drawCircle(cx, cy, 3f, dotP);

        canvas.drawLine(cx - size, cy, cx - gap, cy, crosshairPaint);
        canvas.drawLine(cx + gap, cy, cx + size, cy, crosshairPaint);
        canvas.drawLine(cx, cy - size, cx, cy - gap, crosshairPaint);
        canvas.drawLine(cx, cy + gap, cx, cy + size, crosshairPaint);

        float radius = 22f;
        crosshairCirclePaint.setAlpha(120);
        canvas.drawCircle(cx, cy, radius, crosshairCirclePaint);
    }

    private void drawScanningDots(Canvas canvas, int w, int h) {
        float spacing = 56f;
        float dotRadius = 2.2f;
        float offsetY = scanPhase * spacing;

        for (float x = spacing / 2; x < w; x += spacing) {
            for (float y = -spacing + offsetY; y < h + spacing; y += spacing) {
                float dx = x - w / 2f;
                float dy = y - h / 2f;
                float dist = (float) Math.sqrt(dx * dx + dy * dy);
                float maxDist = (float) Math.sqrt(w * w + h * h) / 2f;
                float alpha = Math.max(0, 1f - dist / maxDist);
                alpha *= 0.4f;

                float wave = (float) Math.sin((x + y) * 0.02f + scanPhase * Math.PI * 4);
                alpha *= 0.6f + 0.4f * wave;

                dotPaint.setAlpha((int) (alpha * 255));
                canvas.drawCircle(x, y, dotRadius, dotPaint);
            }
        }

        float lineY = h * scanPhase;
        scanLinePaint.setAlpha(60);
        canvas.drawLine(0, lineY, w, lineY, scanLinePaint);
    }

    private void drawProductLabel(Canvas canvas, float x, float y, String name, String sku) {
        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setColor(0xDD1A1A2E);
        bgPaint.setStyle(Paint.Style.FILL);

        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setColor(ACCENT);
        borderPaint.setStrokeWidth(2f);
        borderPaint.setStyle(Paint.Style.STROKE);

        Paint namePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        namePaint.setColor(Color.WHITE);
        namePaint.setTextSize(36f);
        namePaint.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        namePaint.setTextAlign(Paint.Align.CENTER);

        Paint skuPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        skuPaint.setColor(0xAAFFFFFF);
        skuPaint.setTextSize(24f);
        skuPaint.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        skuPaint.setTextAlign(Paint.Align.CENTER);

        float nameW = namePaint.measureText(name);
        float skuW = skuPaint.measureText("SKU: " + sku);
        float textW = Math.max(nameW, skuW);

        float padH = 32f;
        float padV = 20f;
        float boxW = textW + padH * 2;
        float boxH = 90f + padV;

        // Draw pointer line
        Paint pointerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        pointerPaint.setColor(Color.WHITE);
        pointerPaint.setStrokeWidth(3f);
        canvas.drawLine(x, y, x, y - 60f, pointerPaint);
        canvas.drawCircle(x, y, 6f, pointerPaint);

        // Adjust Y so box is above the pointer
        float boxCenterY = y - 60f - boxH / 2;

        RectF bg = new RectF(
                x - boxW / 2, boxCenterY - boxH / 2,
                x + boxW / 2, boxCenterY + boxH / 2);

        // Shadow
        Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadowPaint.setColor(0x40000000);
        shadowPaint.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(new RectF(bg.left + 4, bg.top + 4, bg.right + 4, bg.bottom + 4), 16f, 16f, shadowPaint);

        canvas.drawRoundRect(bg, 16f, 16f, bgPaint);
        canvas.drawRoundRect(bg, 16f, 16f, borderPaint);

        float nameY = boxCenterY - 10f + namePaint.getTextSize() / 3f;
        float skuY = boxCenterY + 30f + skuPaint.getTextSize() / 3f;

        canvas.drawText(name, x, nameY, namePaint);
        canvas.drawText("SKU: " + sku, x, skuY, skuPaint);
    }
}
