import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, RefreshCw, Loader2, BarChart3, Target, Zap, Sparkles, Database } from "lucide-react"
import { api } from "@/api/client"

export function AdaptiveLearning() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [evaluating, setEvaluating] = useState(false)
    const [error, setError] = useState(null)

    // Natural Language Feedback State
    const [feedbackText, setFeedbackText] = useState("")
    const [submittingFeedback, setSubmittingFeedback] = useState(false)
    const [feedbackSuccess, setFeedbackSuccess] = useState(null)

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault()
        if (!feedbackText.trim()) return

        setSubmittingFeedback(true)
        setFeedbackSuccess(null)

        try {
            const result = await api.submitManualFeedback(feedbackText)
            if (result.success) {
                setFeedbackSuccess({ type: 'success', text: result.message })
                setFeedbackText("")
                // Sync data after a brief delay
                setTimeout(fetchAnalytics, 1500)
            } else {
                setFeedbackSuccess({ type: 'error', text: result.message })
            }
        } catch (err) {
            setFeedbackSuccess({ type: 'error', text: "An error occurred while sending feedback. Is the ML service running?" })
        } finally {
            setSubmittingFeedback(false)
            setTimeout(() => setFeedbackSuccess(null), 8000)
        }
    }

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const result = await api.getFeedbackAnalytics()
            setData(result)
            setError(null)
        } catch (err) {
            console.error("Failed to fetch feedback analytics:", err)
            setError(err.message || "Failed to load learning data")
        } finally {
            setLoading(false)
        }
    }

    const triggerEval = async () => {
        setEvaluating(true)
        try {
            await api.triggerFeedbackEvaluation()
            await fetchAnalytics()
        } catch (err) {
            console.error("Evaluation trigger failed:", err)
        } finally {
            setEvaluating(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const health = data?.learning_health || {}
    const distribution = data?.outcome_distribution || {}
    const topLearners = data?.top_learners || []
    const worstPerformers = data?.worst_performers || []
    const categoryBiases = data?.category_biases || {}

    const totalOutcomes = (distribution.accurate || 0) + (distribution.overstock || 0) + (distribution.stockout || 0) + (distribution.waste_risk || 0)

    const getOutcomeColor = (type) => {
        switch (type) {
            case 'accurate': return 'bg-emerald-500'
            case 'overstock': return 'bg-[#17A2B8]'
            case 'stockout': return 'bg-red-500'
            case 'waste_risk': return 'bg-[#1B4F72]'
            default: return 'bg-slate-400'
        }
    }

    const getOutcomeIcon = (type) => {
        switch (type) {
            case 'accurate': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            case 'overstock': return <TrendingUp className="h-3.5 w-3.5 text-[#17A2B8]" />
            case 'stockout': return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            case 'waste_risk': return <TrendingDown className="h-3.5 w-3.5 text-[#1B4F72]" />
            default: return null
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                            <Brain className="h-4 w-4 text-violet-600" />
                        </div>
                        <span>Adaptive Learning</span>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Loading learning data...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-[#17A2B8]/10">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                            <Brain className="h-4 w-4 text-violet-600" />
                        </div>
                        Model Intelligence
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wide">
                            Active
                        </span>
                    </CardTitle>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Automated Training Override */}
                <div className="pt-0">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-[#17A2B8]" />
                            Autonomous Model Retraining
                        </p>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                Live
                            </span>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-xl p-5 shadow-sm hover:border-violet-200 transition-colors">
                        <div className="space-y-4 mb-5">
                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-[11px] text-slate-600 font-medium">Data Ingestion</span>
                                <span className="text-[10px] font-bold text-blue-600">POS-Realtime</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                <span className="text-[11px] text-slate-600 font-medium">Anomaly Detection</span>
                                <span className="text-[10px] font-bold text-violet-600">Active</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[11px] text-slate-600 font-medium">Model Calibration</span>
                                <span className="text-[10px] font-bold text-[#17A2B8]">Self-Optimizing</span>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                setSubmittingFeedback(true)
                                setFeedbackSuccess(null)
                                try {
                                    const res = await api.triggerModelRetraining()
                                    if (res.success) {
                                        setFeedbackSuccess({ type: 'success', text: "Deep Training loop initiated. This may take 3-5 minutes." })
                                        setTimeout(fetchAnalytics, 1500)
                                    } else {
                                        setFeedbackSuccess({ type: 'error', text: "Model retraining failed to start." })
                                    }
                                } catch (err) {
                                    setFeedbackSuccess({ type: 'error', text: "Failed to connect to ML Training Service." })
                                } finally {
                                    setSubmittingFeedback(false)
                                    setTimeout(() => setFeedbackSuccess(null), 8000)
                                }
                            }}
                            disabled={submittingFeedback}
                            className="w-full relative group overflow-hidden py-3.5 bg-violet-600 text-white rounded-xl text-sm font-bold transition-all hover:bg-violet-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                            <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-12 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000" />
                            <div className="flex justify-center items-center gap-2">
                                {submittingFeedback ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Training Neural Weights...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        <span>Sync & Enhanced Retraining</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                    {feedbackSuccess && (
                        <div className={`mt-4 p-4 rounded-xl text-xs border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${feedbackSuccess.type === 'success'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                            : 'bg-red-50 border-red-100 text-red-800'
                            }`}>
                            {feedbackSuccess.type === 'success' ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                            )}
                            <div>
                                <p className="font-bold mb-0.5">Retraining Status</p>
                                <p className="opacity-90">{feedbackSuccess.text}</p>
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 text-center">
                        🧠 EWMA Bias Correction (α=0.3) • Safety bounds [0.7x – 1.4x] • Per-SKU + Category fallback
                    </p>
                </div>
            </CardContent>
        </Card >
    )
}
