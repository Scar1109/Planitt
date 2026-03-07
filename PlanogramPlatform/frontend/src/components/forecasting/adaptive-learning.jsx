import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, RefreshCw, Loader2, BarChart3, Target, Zap, SendHorizontal, Sparkles } from "lucide-react"
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
            case 'overstock': return 'bg-amber-500'
            case 'stockout': return 'bg-red-500'
            case 'waste_risk': return 'bg-purple-500'
            default: return 'bg-slate-400'
        }
    }

    const getOutcomeIcon = (type) => {
        switch (type) {
            case 'accurate': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            case 'overstock': return <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
            case 'stockout': return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            case 'waste_risk': return <TrendingDown className="h-3.5 w-3.5 text-purple-600" />
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
            <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                            <Brain className="h-4 w-4 text-violet-600" />
                        </div>
                        Adaptive Learning
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wide">
                            Self-Correcting
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={triggerEval}
                            disabled={evaluating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3 w-3 ${evaluating ? 'animate-spin' : ''}`} />
                            {evaluating ? 'Evaluating...' : 'Run Evaluation'}
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
                {error && !data && (
                    <div className="text-center py-6">
                        <Brain className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No learning data yet. Generate forecasts to start the feedback loop.</p>
                    </div>
                )}

                {data && (
                    <>
                        {/* HEALTH METRICS ROW */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 text-center border border-emerald-100">
                                <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                                    <Target className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">Accuracy</span>
                                </div>
                                <p className="text-xl font-bold text-emerald-700">{health.accuracy_rate || 0}%</p>
                            </div>
                            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 text-center border border-blue-100">
                                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                                    <BarChart3 className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">Evaluated</span>
                                </div>
                                <p className="text-xl font-bold text-blue-700">{health.total_outcomes_evaluated || 0}</p>
                            </div>
                            <div className="rounded-lg bg-gradient-to-br from-violet-50 to-violet-100/50 p-3 text-center border border-violet-100">
                                <div className="flex items-center justify-center gap-1 text-violet-600 mb-1">
                                    <Zap className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">Avg Bias</span>
                                </div>
                                <p className="text-xl font-bold text-violet-700">{health.avg_bias_correction || '1.0'}x</p>
                            </div>
                            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 p-3 text-center border border-amber-100">
                                <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                                    <TrendingUp className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wide font-medium">Trend</span>
                                </div>
                                <p className={`text-xl font-bold ${String(health.improvement_trend || '').includes('+') ? 'text-emerald-700' : String(health.improvement_trend || '').includes('-') ? 'text-red-700' : 'text-slate-700'}`}>
                                    {health.improvement_trend || '0%'}
                                </p>
                            </div>
                        </div>

                        {/* OUTCOME DISTRIBUTION BAR */}
                        {totalOutcomes > 0 && (
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-2">Outcome Distribution</p>
                                <div className="flex rounded-full overflow-hidden h-3 bg-slate-100">
                                    {['accurate', 'overstock', 'stockout', 'waste_risk'].map(type => {
                                        const count = distribution[type] || 0
                                        const pct = (count / totalOutcomes) * 100
                                        if (pct === 0) return null
                                        return (
                                            <div
                                                key={type}
                                                className={`${getOutcomeColor(type)} transition-all`}
                                                style={{ width: `${pct}%` }}
                                                title={`${type}: ${count} (${pct.toFixed(1)}%)`}
                                            />
                                        )
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                                    {['accurate', 'overstock', 'stockout', 'waste_risk'].map(type => (
                                        <div key={type} className="flex items-center gap-1">
                                            {getOutcomeIcon(type)}
                                            <span className="capitalize">{type.replace('_', ' ')}</span>
                                            <span className="font-medium text-slate-700">{distribution[type] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TOP LEARNERS */}
                        {topLearners.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-2">🏆 Top Learners</p>
                                <div className="space-y-1.5">
                                    {topLearners.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-medium text-slate-700">{item.sku}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-emerald-700 font-medium">{item.accuracy_now}% accurate</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                                                    {item.correction}x
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* WORST PERFORMERS */}
                        {worstPerformers.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-2">⚠️ Needs Attention</p>
                                <div className="space-y-1.5">
                                    {worstPerformers.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/30 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-medium text-slate-700">{item.sku}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                                                    {item.error_pattern?.replace('chronic_', '').replace('forecast', '')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-red-700 font-medium">{item.accuracy_now}% accurate</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                                    {item.correction}x
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CATEGORY BIASES */}
                        {Object.keys(categoryBiases).length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-2">Category Bias Map</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(categoryBiases).map(([cat, bias]) => {
                                        const isHigh = bias > 1.05
                                        const isLow = bias < 0.95
                                        return (
                                            <span
                                                key={cat}
                                                className={`text-[10px] px-2 py-1 rounded-full font-medium border ${isHigh
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : isLow
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}
                                            >
                                                {cat} {bias}x
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* EMPTY STATE */}
                        {totalOutcomes === 0 && (
                            <div className="text-center py-6">
                                <Brain className="h-10 w-10 text-violet-200 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-600">Learning Loop Initialized</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Forecasts are being logged. Run evaluation in a few days to start seeing outcomes.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* LLM Manual Feedback Override */}
                <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        Train the AI
                    </p>
                    <form onSubmit={handleFeedbackSubmit} className="relative">
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder='e.g., "Forecast shows last friday white sugar sale increase 20% but I calculated it manually and it was around 8%"'
                            className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 pr-12 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 min-h-[80px]"
                            disabled={submittingFeedback}
                        />
                        <button
                            type="submit"
                            disabled={!feedbackText.trim() || submittingFeedback}
                            className="absolute bottom-3 right-3 p-1.5 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 transition-colors"
                        >
                            {submittingFeedback ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <SendHorizontal className="h-4 w-4" />
                            )}
                        </button>
                    </form>
                    {feedbackSuccess && (
                        <div className={`mt-2 p-2.5 rounded-md text-xs border flex items-start gap-2 ${feedbackSuccess.type === 'success'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-red-50 border-red-100 text-red-700'
                            }`}>
                            {feedbackSuccess.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            )}
                            <p>{feedbackSuccess.text}</p>
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
        </Card>
    )
}
