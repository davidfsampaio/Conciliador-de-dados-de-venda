
// This declares the global XLSX variable provided by the script tag in index.html
declare var XLSX: any;

export const parseExcelFile = <T,>(file: File): Promise<T[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            try {
                const data = event.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as T[];
                resolve(json);
            } catch (e) {
                console.error("Error parsing Excel file:", e);
                reject(new Error("Could not parse the Excel file. Please ensure it's a valid .xlsx or .csv file."));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};
