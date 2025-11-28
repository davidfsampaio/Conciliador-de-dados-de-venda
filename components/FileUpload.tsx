
import React, { useState, useCallback, useRef } from 'react';
import { FileText, XCircle } from 'lucide-react';
import { parseExcelFile } from '../services/parser';

interface FileUploadProps {
    title: string;
    description: string;
    onFileParsed: (data: unknown[]) => void;
    Icon: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({ title, description, onFileParsed, Icon }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File | null) => {
        if (!file) return;
        
        setError(null);
        if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
            setError("Formato de arquivo inválido. Use .xlsx, .xls ou .csv");
            return;
        }

        setFileName(file.name);
        try {
            const data = await parseExcelFile(file);
            onFileParsed(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao processar o arquivo.");
            onFileParsed([]);
            setFileName(null);
        }

    }, [onFileParsed]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files ? e.target.files[0] : null);
    };

    const handleClear = () => {
        setFileName(null);
        onFileParsed([]);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const dragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const dragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const fileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        handleFile(files.length > 0 ? files[0] : null);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col justify-between border-2 border-gray-700 hover:border-brand-blue-600 transition-colors">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 mb-4">{description}</p>
            </div>
            
            {fileName ? (
                <div className="bg-gray-700 p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center overflow-hidden">
                        <FileText className="w-5 h-5 text-brand-blue-400 flex-shrink-0" />
                        <span className="ml-2 text-sm text-gray-200 truncate">{fileName}</span>
                    </div>
                    <button onClick={handleClear} className="text-gray-400 hover:text-white transition-colors">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div 
                    onDragOver={dragOver}
                    onDragLeave={dragLeave}
                    onDrop={fileDrop}
                    className={`border-2 border-dashed ${isDragging ? 'border-brand-blue-500 bg-gray-700/50' : 'border-gray-600'} rounded-lg p-6 text-center cursor-pointer`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                    {Icon}
                    <p className="text-sm text-gray-400 mt-2">Arraste e solte ou <span className="font-semibold text-brand-blue-400">clique para selecionar</span></p>
                    {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                </div>
            )}
        </div>
    );
};
