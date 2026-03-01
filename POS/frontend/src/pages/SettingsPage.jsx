import { useState } from 'react';
import Panel from '../components/ui/Panel';
import api from '../services/api';

export default function SettingsPage() {
    const [terminalId, setTerminalId] = useState('T1');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    async function openDrawer() {
        try {
            await api.post('/printing/drawer/open', { terminalId });
            setStatus('Drawer open signal sent.');
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open drawer');
        }
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Terminal Settings">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Terminal ID</label>
                    <input
                        value={terminalId}
                        onChange={(e) => setTerminalId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                </div>
            </Panel>
            <Panel title="Hardware Controls">
                <button type="button" onClick={openDrawer} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    Open Cash Drawer
                </button>
                {status ? <p className="mt-3 text-sm text-emerald-700">{status}</p> : null}
                {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            </Panel>
        </div>
    );
}
