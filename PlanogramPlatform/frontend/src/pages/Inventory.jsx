import React from 'react';
import { InventoryStats } from '../components/inventory/inventory-stats';
import { InventoryTable } from '../components/inventory/inventory-table';

const Inventory = () => {
    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
                    <p className="text-slate-500 mt-1">Real-time stock monitoring and AI forecasting</p>
                </div>
            </div>

            <InventoryStats />

            <InventoryTable />
        </div>
    );
};

export default Inventory;
