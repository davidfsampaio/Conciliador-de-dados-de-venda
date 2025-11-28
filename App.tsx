import React, { useState, useCallback } from 'react';
import { FileUp, LoaderCircle, Table, ListRestart, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

import type { ReferenceData, SurveyData, ResendData, SatisfactionResult, ResendGroup, NormalizedResendItem } from './types';
import { FileUpload } from './components/FileUpload';
import { ResultsTabs } from './components/ResultsTabs';

// Garante que qualquer valor seja convertido para string de forma segura antes de renderizar
const safeToString = (value: any): string => {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    if (value instanceof Date) {
        return value.toLocaleDateString('pt-BR');
    }
    return String(value);
};

// Função robusta para extrair um objeto JSON de uma string de texto, comum em respostas de IA
const extractJsonFromAiResponse = (text: string): any | null => {
    if (!text) return null;

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*}|\[[\s\S]*\])/);

    if (!jsonMatch) {
        console.warn("A resposta da IA não contém um bloco JSON reconhecível.", text);
        return null;
    }
    
    const jsonString = jsonMatch[1] || jsonMatch[2];
    if (!jsonString) {
        console.warn("Não foi possível extrair a string JSON do bloco correspondente.", text);
        return null;
    }

    try {
        return JSON.parse(jsonString.trim());
    } catch (parseError) {
        console.error("Falha ao parsear a string JSON extraída.", {
            error: parseError,
            extractedString: jsonString,
            originalText: text,
        });
        return null;
    }
};

const satisfactionSchema = {
    type: Type.OBJECT,
    properties: {
      chassi: { type: Type.STRING },
      cliente: { type: Type.STRING },
      vendedor: { type: Type.STRING },
      origemVenda: { type: Type.STRING },
      satisfacao: { type: Type.NUMBER },
    },
    required: ["chassi", "cliente", "vendedor", "origemVenda", "satisfacao"],
};
  
const resendSchema = {
    type: Type.OBJECT,
    properties: {
        nomeCliente: { type: Type.STRING },
        chassi: { type: Type.STRING },
        concessionaria: { type: Type.STRING },
        dataPosse: { type: Type.STRING },
    },
    required: ["nomeCliente", "chassi", "concessionaria", "dataPosse"],
};

const App: React.FC = () => {
    const [referenceData, setReferenceData] = useState<ReferenceData[]>([]);
    const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
    const [resendData, setResendData] = useState<ResendData[]>([]);

    const [satisfactionResults, setSatisfactionResults] = useState<SatisfactionResult[]>([]);
    const [resendGroups, setResendGroups] = useState<ResendGroup>({});

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [useAI, setUseAI] = useState<boolean>(true);

    const getProperty = <T extends object>(obj: T, key: string): any => {
        const normalizedKey = key.toLowerCase().trim();
        for (const prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                if (prop.toLowerCase().trim() === normalizedKey) {
                    return obj[prop as keyof T];
                }
            }
        }
        return undefined;
    };

    const processWithAI = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSatisfactionResults([]);
        setResendGroups({});
    
        try {
            if (!process.env.API_KEY) {
                throw new Error("A chave de API do Google AI não foi configurada.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
            const referenceMap = new Map<string, ReferenceData>();
            referenceData.forEach(item => {
                const chassi = getProperty(item, 'CHASSI');
                if (chassi) {
                    referenceMap.set(String(chassi).trim(), item);
                }
            });
    
            const satisfactionPromises = surveyData.map(async (survey, index) => {
                setProcessingStatus(`Analisando satisfação ${index + 1} de ${surveyData.length}...`);
                const chassi = getProperty(survey, 'CHASSI');
                if (!chassi) return null;
    
                const ref = referenceMap.get(String(chassi).trim());
                if (ref) {
                    const prompt = `
                    Analise os seguintes dados JSON e extraia as informações solicitadas.
                    Dados de Referência da Venda: ${JSON.stringify(ref)}
                    Dados da Pesquisa de Satisfação: ${JSON.stringify(survey)}
                    
                    Com base nos dados, extraia EXATAMENTE no formato JSON:
                    - "chassi": O número do chassi.
                    - "cliente": O nome do cliente.
                    - "vendedor": O nome do vendedor.
                    - "origemVenda": A origem da venda.
                    - "satisfacao": O valor numérico da satisfação geral (ex: se for 90%, retorne 90).
                    `;
                    
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: prompt,
                        config: { 
                            responseMimeType: "application/json",
                            responseSchema: satisfactionSchema,
                        }
                    });

                    const text = response.text;
                    if (!text) {
                        console.warn(`A IA não retornou texto para o chassi (satisfação): ${chassi}`);
                        return null;
                    }
                    const parsedJson = extractJsonFromAiResponse(text);
                    if (!parsedJson) {
                         console.error(`Não foi possível extrair JSON válido para o chassi (satisfação): ${chassi}`, text);
                         return null;
                    }
                    return parsedJson as SatisfactionResult;
                }
                return null;
            });
    
            const satisfaction = (await Promise.all(satisfactionPromises)).filter((item): item is SatisfactionResult => item !== null);
            setSatisfactionResults(satisfaction);
    
            const resendGroup: ResendGroup = {};
            for (let i = 0; i < resendData.length; i++) {
                const item = resendData[i];
                setProcessingStatus(`Analisando reenvio ${i + 1} de ${resendData.length}...`);
                const chassi = getProperty(item, 'Chassi');
                if (!chassi) continue;
    
                const ref = referenceMap.get(String(chassi).trim());
                const origemVenda = ref ? (getProperty(ref, 'ORIGEM VENDA') || 'Origem Desconhecida') : 'Origem Desconhecida';
                
                const prompt = `
                Analise os seguintes dados JSON e extraia as informações para uma pesquisa de reenivo.
                Dados da Pesquisa para Reenvio: ${JSON.stringify(item)}
                
                Com base nos dados, extraia EXATAMENTE no formato JSON:
                - "nomeCliente": O nome do cliente.
                - "chassi": O número do chassi.
                - "concessionaria": O nome da concessionária de venda.
                - "dataPosse": A data da posse do veículo.
                `;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                    config: { 
                        responseMimeType: "application/json",
                        responseSchema: resendSchema,
                    }
                });

                const text = response.text;
                if (!text) {
                    console.warn(`A IA não retornou texto para o chassi (reenvio): ${chassi}`);
                    continue;
                }

                const normalizedItem = extractJsonFromAiResponse(text);
                if (normalizedItem) {
                    if (!resendGroup[origemVenda]) {
                        resendGroup[origemVenda] = [];
                    }
                    resendGroup[origemVenda].push(normalizedItem as NormalizedResendItem);
                } else {
                     console.error(`Não foi possível extrair JSON válido para o chassi (reenvio): ${chassi}`, text);
                }
            }
            setResendGroups(resendGroup);
    
        } catch (e) {
            console.error("Erro ao processar com IA:", e);
            setError(`Ocorreu um erro durante o processamento com IA. Detalhes: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsLoading(false);
            setProcessingStatus('');
        }
    }, [referenceData, surveyData, resendData]);

    const processLocally = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setProcessingStatus('Processando localmente...');

        setTimeout(() => {
            try {
                 const referenceMap = new Map<string, ReferenceData>();
                referenceData.forEach(item => {
                    const chassi = getProperty(item, 'CHASSI');
                    if (chassi) {
                       referenceMap.set(String(chassi).trim(), item);
                    }
                });

                const satisfaction: SatisfactionResult[] = surveyData
                    .map(survey => {
                        const chassi = getProperty(survey, 'CHASSI');
                        if (!chassi) return null;
                        const ref = referenceMap.get(String(chassi).trim());
                        if (ref) {
                            const satisfacaoGeral = getProperty(survey, 'SATISFACAO GERAL');
                            return {
                                chassi: safeToString(chassi),
                                cliente: safeToString(getProperty(ref, 'CLIENTE')),
                                vendedor: safeToString(getProperty(ref, 'VENDEDOR')),
                                origemVenda: safeToString(getProperty(ref, 'ORIGEM VENDA')),
                                satisfacao: satisfacaoGeral !== undefined ? Number(satisfacaoGeral) : 0,
                            };
                        }
                        return null;
                    })
                    .filter((item): item is SatisfactionResult => item !== null);
                setSatisfactionResults(satisfaction);

                const resend: ResendGroup = resendData.reduce((acc, item) => {
                    const chassi = getProperty(item, 'Chassi');
                    if (!chassi) return acc;
                    const ref = referenceMap.get(String(chassi).trim());
                    const origemVenda = ref ? (getProperty(ref, 'ORIGEM VENDA') || 'Origem Desconhecida') : 'Origem Desconhecida';
                    if (!acc[origemVenda]) acc[origemVenda] = [];
                    const normalizedItem: NormalizedResendItem = {
                        chassi: safeToString(chassi),
                        nomeCliente: safeToString(getProperty(item, 'Nome do cliente')),
                        concessionaria: safeToString(getProperty(item, 'Concessionaria de venda')),
                        dataPosse: safeToString(getProperty(item, 'Data da posse')),
                    };
                    acc[origemVenda].push(normalizedItem);
                    return acc;
                }, {} as ResendGroup);
                setResendGroups(resend);

            } catch (e) {
                console.error("Erro ao processar dados:", e);
                setError("Ocorreu um erro ao processar os arquivos. Verifique o formato e o conteúdo dos arquivos.");
            } finally {
                setIsLoading(false);
                setProcessingStatus('');
            }
        }, 500);
    }, [referenceData, surveyData, resendData]);

    const handleProcessData = () => {
        if (referenceData.length === 0 || surveyData.length === 0 || resendData.length === 0) {
            setError("Por favor, carregue todos os três arquivos antes de processar.");
            return;
        }
        if (useAI) {
            processWithAI();
        } else {
            processLocally();
        }
    };
    
    const canProcess = referenceData.length > 0 && surveyData.length > 0 && resendData.length > 0;
    const hasResults = satisfactionResults.length > 0 || Object.keys(resendGroups).length > 0;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-brand-blue-400">Conciliador de Dados de Vendas</h1>
                    <p className="text-lg text-gray-400 mt-2">Faça o upload dos arquivos para iniciar a conciliação</p>
                </header>
                
                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative mb-6" role="alert">
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                
                <main>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <FileUpload title="1. Dados de Referência" description="Planilha principal com dados de vendas, vendedores e origem." onFileParsed={(data) => setReferenceData(data as ReferenceData[])} Icon={<Table className="w-8 h-8 mx-auto text-brand-blue-500" />} />
                        <FileUpload title="2. Pesquisas Respondidas" description="Planilha com as respostas das pesquisas de satisfação." onFileParsed={(data) => setSurveyData(data as SurveyData[])} Icon={<FileUp className="w-8 h-8 mx-auto text-brand-blue-500" />} />
                        <FileUpload title="3. Pesquisas para Reenvio" description="Planilha com pesquisas disponíveis para serem reenviadas." onFileParsed={(data) => setResendData(data as ResendData[])} Icon={<ListRestart className="w-8 h-8 mx-auto text-brand-blue-500" />} />
                    </div>

                    <div className="flex flex-col items-center justify-center mb-8 gap-4">
                        <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-700">
                           <BrainCircuit className={`w-6 h-6 ${useAI ? 'text-brand-blue-400' : 'text-gray-500'}`} />
                           <span className="font-medium text-white">Usar IA para Conciliação (Recomendado)</span>
                           <button onClick={() => setUseAI(!useAI)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${useAI ? 'bg-brand-blue-600' : 'bg-gray-600'}`}>
                              <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useAI ? 'translate-x-5' : 'translate-x-0'}`}></span>
                           </button>
                        </div>
                         <p className="text-xs text-gray-500 text-center max-w-md">
                            A IA oferece uma conciliação mais precisa, mesmo com colunas de nomes diferentes. O modo local é mais rápido, mas exige que os nomes das colunas sejam exatos.
                        </p>
                    </div>

                    <div className="text-center mb-8">
                        <button onClick={handleProcessData} disabled={!canProcess || isLoading} className="bg-brand-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center mx-auto shadow-lg shadow-brand-blue-900/50 w-64">
                            {isLoading ? (
                                <div className="flex flex-col items-center">
                                    <LoaderCircle className="animate-spin" />
                                    <span className="text-xs mt-1">{processingStatus}</span>
                                </div>
                            ) : (
                                'Processar e Conciliar Dados'
                            )}
                        </button>
                    </div>

                    {hasResults && !isLoading && (
                        <ResultsTabs satisfactionResults={satisfactionResults} resendGroups={resendGroups} />
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;