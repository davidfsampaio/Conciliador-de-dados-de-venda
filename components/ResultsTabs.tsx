
import React, { useState } from 'react';
import type { SatisfactionResult, ResendGroup, NormalizedResendItem } from '../types';
import { ChevronDown, Star, Users, MapPin, Calendar, Hash } from 'lucide-react';

type Tab = 'satisfaction' | 'resend';

interface ResultsTabsProps {
    satisfactionResults: SatisfactionResult[];
    resendGroups: ResendGroup;
}

const SatisfactionTable: React.FC<{ data: SatisfactionResult[] }> = ({ data }) => {
    if (data.length === 0) {
        return <p className="text-center text-gray-400 py-8">Nenhum dado de satisfação correspondente encontrado.</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vendedor</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cliente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Origem Venda</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Chassi</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Satisfação (%)</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                    {data.map((item, index) => (
                        <tr key={`${item.chassi}-${index}`} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.vendedor}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.cliente}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.origemVenda}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{item.chassi}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${item.satisfacao >= 80 ? 'bg-green-800 text-green-200' : item.satisfacao >= 60 ? 'bg-yellow-800 text-yellow-200' : 'bg-red-800 text-red-200'}`}>
                                    {item.satisfacao}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AccordionItem: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-white hover:bg-gray-700/50 focus:outline-none transition-colors"
            >
                <span>{title}</span>
                <div className="flex items-center">
                   <span className="mr-4 text-sm font-normal bg-brand-blue-800 text-brand-blue-200 px-3 py-1 rounded-full">{count} pesquisas</span>
                   <ChevronDown className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && <div className="p-4 bg-gray-800">{children}</div>}
        </div>
    );
};

const ResendGroupView: React.FC<{ groups: ResendGroup }> = ({ groups }) => {
    const sortedOrigins = Object.keys(groups).sort();
    if (sortedOrigins.length === 0) {
        return <p className="text-center text-gray-400 py-8">Nenhum dado para reenvio correspondente encontrado.</p>;
    }
    return (
        <div className="space-y-2">
            {sortedOrigins.map(origem => (
                <AccordionItem key={origem} title={origem} count={groups[origem].length}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {groups[origem].map((item: NormalizedResendItem, index) => (
                           <div key={`${item.chassi}-${index}`} className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-2">
                               <p className="font-bold text-white flex items-center"><Users className="w-4 h-4 mr-2 text-brand-blue-400"/> {item.nomeCliente}</p>
                               <p className="text-sm text-gray-400 flex items-center"><Hash className="w-4 h-4 mr-2 text-brand-blue-400"/> {item.chassi}</p>
                               <p className="text-sm text-gray-400 flex items-center"><MapPin className="w-4 h-4 mr-2 text-brand-blue-400"/> {item.concessionaria}</p>
                               <p className="text-sm text-gray-400 flex items-center"><Calendar className="w-4 h-4 mr-2 text-brand-blue-400"/> {item.dataPosse}</p>
                           </div>
                        ))}
                    </div>
                </AccordionItem>
            ))}
        </div>
    );
};

export const ResultsTabs: React.FC<ResultsTabsProps> = ({ satisfactionResults, resendGroups }) => {
    const [activeTab, setActiveTab] = useState<Tab>('satisfaction');

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-xl border border-gray-700">
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-4 px-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('satisfaction')}
                        className={`${
                            activeTab === 'satisfaction'
                                ? 'border-brand-blue-500 text-brand-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center`}
                    >
                       <Star className="w-5 h-5 mr-2" />
                        Satisfação do Cliente ({satisfactionResults.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('resend')}
                        className={`${
                            activeTab === 'resend'
                                ? 'border-brand-blue-500 text-brand-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center`}
                    >
                       <Users className="w-5 h-5 mr-2" />
                        Pesquisas para Reenvio ({Object.keys(resendGroups).length} grupos)
                    </button>
                </nav>
            </div>
            <div className="p-2 sm:p-4">
                {activeTab === 'satisfaction' && <SatisfactionTable data={satisfactionResults} />}
                {activeTab === 'resend' && <ResendGroupView groups={resendGroups} />}
            </div>
        </div>
    );
};
