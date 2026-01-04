import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const categoryData = [
    { name: "Dairy", value: 245, color: "#3b82f6", stockValue: 420000 },
    { name: "Beverages", value: 312, color: "#10b981", stockValue: 380000 },
    { name: "Bakery", value: 156, color: "#f59e0b", stockValue: 180000 },
    { name: "Produce", value: 198, color: "#ef4444", stockValue: 290000 },
    { name: "Frozen", value: 178, color: "#8b5cf6", stockValue: 350000 },
    { name: "Dry Goods", value: 158, color: "#06b6d4", stockValue: 450000 },
]

export function CategoryBreakdown() {
    const totalSKUs = categoryData.reduce((sum, cat) => sum + cat.value, 0)

    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-foreground">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                                formatter={(value) => [`${value} SKUs`, "Count"]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-3 mt-4">
                    {categoryData.map((category) => (
                        <div key={category.name} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-foreground">{category.name}</span>
                                    <span className="text-muted-foreground">{category.value} SKUs</span>
                                </div>
                                <Progress value={(category.value / totalSKUs) * 100} className="h-1.5 mt-1" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
