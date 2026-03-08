import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { FaHistory, FaTrash, FaRedo } from 'react-icons/fa';

const ComplianceHistory = () => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [runToDelete, setRunToDelete] = useState(null);

    useEffect(() => {
        const fetchRuns = async () => {
            try {
                const res = await api.get('/compliance/runs');
                setRuns(res.data);
            } catch (err) {
                console.error("Failed to load compliance runs", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRuns();
    }, []);

    const handleDelete = (id) => {
        setRunToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!runToDelete) return;
        try {
            setActionLoading(runToDelete);
            await api.delete(`/compliance/runs/${runToDelete}`);
            setRuns(runs.filter(r => r._id !== runToDelete));
            setIsDeleteModalOpen(false);
        } catch (error) {
            alert("Failed to delete run");
            console.error(error);
        } finally {
            setActionLoading(null);
            setRunToDelete(null);
        }
    };

    const handleRerun = async (id) => {
        try {
            setActionLoading(id);
            const res = await api.post(`/compliance/runs/${id}/rerun`);
            alert("Rerun successful! Score: " + res.data.result.compliance_score);
            const runsRes = await api.get('/compliance/runs');
            setRuns(runsRes.data);
        } catch (error) {
            alert("Failed to rerun compliance check");
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-8 text-gray-500">Loading History...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                Compliance Check History
            </h1>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Run Name</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Score</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                                        No compliance runs recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                runs.map((run) => (
                                    <tr key={run._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {run.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(run.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${run.compliance_score >= 80 ? 'text-green-600' : run.compliance_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {run.compliance_score}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {run.status === 'success' ? (
                                                <span className="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Success</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Failed</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-4 text-right flex justify-end gap-2">
                                            {/* <button 
                                                onClick={() => handleRerun(run._id)} 
                                                disabled={actionLoading === run._id}
                                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                                title="Rerun Check"
                                            >
                                                {actionLoading === run._id ? 'Running...' : <FaRedo />}
                                            </button> */}
                                            <button 
                                                onClick={() => handleDelete(run._id)} 
                                                disabled={actionLoading === run._id}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                title="Delete Log"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                title="Delete Compliance Run"
            >
                <p className="text-gray-600 mb-6">Are you sure you want to delete this run log? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsDeleteModalOpen(false)} 
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                        Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ComplianceHistory;
