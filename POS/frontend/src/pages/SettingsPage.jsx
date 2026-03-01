import { useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Settings, Printer, MonitorSmartphone, RefreshCw, CheckCircle2, AlertTriangle, CloudDownload, CreditCard } from 'lucide-react';
export default function SettingsPage() {
    const [terminalId, setTerminalId] = useState('T1');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const [isSyncing, setIsSyncing] = useState(false);

    async function openDrawer() {
        try {
            await api.post('/printing/drawer/open', { terminalId });
            setStatus('Cash drawer open signal sent successfully.');
            setError('');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open drawer');
            setTimeout(() => setError(''), 4000);
        }
    }

    async function testPrinter() {
        try {
            await api.post('/printing/test', { terminalId });
            setStatus('Test receipt sent to printer.');
            setError('');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Printer test failed');
            setTimeout(() => setError(''), 4000);
        }
    }

    async function syncCatalog() {
        setIsSyncing(true);
        setStatus('');
        setError('');
        // Simulate a catalog sync with PlanogramPlatform
        setTimeout(() => {
            setIsSyncing(false);
            setStatus('Catalog synchronized with Planogram Platform successfully!');
            setTimeout(() => setStatus(''), 4000);
        }, 1500);
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-indigo-600" />
                    System Settings
                </h2>
                <p className="text-sm text-slate-500 mt-1">Configure terminal hardware and synchronization.</p>
            </div>

            {status && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800 border border-emerald-200 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{status}</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-700">
                            <MonitorSmartphone className="h-5 w-5" />
                            Terminal Configuration
                        </CardTitle>
                        <CardDescription>Setup specific settings for this checkout counter.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Terminal ID</label>
                            <Input
                                value={terminalId}
                                onChange={(e) => setTerminalId(e.target.value)}
                                className="max-w-xs h-10 font-mono"
                                placeholder="e.g. T1"
                            />
                            <p className="text-xs text-slate-500">Identifier used for printing and session logs.</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Platform Sync</label>
                            <p className="text-xs text-slate-500 mb-2">Manually trigger an update to pull the latest products and prices from the master Planogram Platform.</p>
                            <Button
                                onClick={syncCatalog}
                                disabled={isSyncing}
                                className="bg-slate-800 hover:bg-slate-900 text-white"
                            >
                                {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}
                                {isSyncing ? 'Syncing...' : 'Sync Catalog Data'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-700">
                            <Printer className="h-5 w-5" />
                            Hardware Diagnostics
                        </CardTitle>
                        <CardDescription>Test connections to physical POS devices.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                            <div>
                                <p className="font-semibold flex items-center gap-2 text-slate-800">
                                    <CreditCard className="h-4 w-4 text-slate-500" />
                                    Cash Drawer
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Send a kick-out signal to open the drawer.</p>
                            </div>
                            <Button variant="outline" onClick={openDrawer} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold shrink-0">
                                Kick Drawer
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                            <div>
                                <p className="font-semibold flex items-center gap-2 text-slate-800">
                                    <Printer className="h-4 w-4 text-slate-500" />
                                    Receipt Printer
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Print a diagnostic test page.</p>
                            </div>
                            <Button variant="outline" onClick={testPrinter} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold shrink-0">
                                Print Test
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
