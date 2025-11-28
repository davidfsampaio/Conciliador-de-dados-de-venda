
// Estrutura de dados do arquivo de referência (1ª imagem)
export interface ReferenceData {
  'Data/Hora Movimento'?: string;
  MODELO?: string;
  CHASSI?: string;
  'Ano/Fabr Mod'?: string;
  CPF_CNPJ?: string;
  CLIENTE?: string;
  'NF-e'?: string;
  VENDEDOR?: string;
  'ORIGEM VENDA'?: string;
  'TIPO VENDA'?: string;
  [key: string]: any;
}

// Estrutura de dados do arquivo de pesquisas respondidas (deduzido)
export interface SurveyData {
  CHASSI?: string;
  'SATISFACAO GERAL'?: number; // Ex: 90 para 90%
  [key: string]: any;
}

// Estrutura de dados do arquivo de pesquisas para reenvio (2ª imagem)
export interface ResendData {
  'Concessionaria de venda'?: string;
  'Nome da conta'?: string;
  'Relação de Posse'?: string;
  'Nome da posse'?: string;
  'Data da posse'?: string;
  'Nome do cliente'?: string;
  Chassi?: string;
  'Data de envio por email'?: string;
  'Data de envio SSI por email'?: string;
  [key: string]: any;
}

// Estrutura para o item de reenvio normalizado, para uso na UI
export interface NormalizedResendItem {
  nomeCliente: string;
  chassi: string;
  concessionaria: string;
  dataPosse: string;
}

// Estrutura do resultado da conciliação de satisfação
export interface SatisfactionResult {
  chassi: string;
  cliente: string;
  vendedor: string;
  origemVenda: string;
  satisfacao: number;
}

// Estrutura do resultado agrupado de pesquisas para reenvio
export interface ResendGroup {
  [origemVenda: string]: NormalizedResendItem[];
}
