"use client"
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx'; // For parsing Excel files (still used for SMILES upload)
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Scatter
} from 'recharts';

// --- Configuration ---
const MAX_COMPOUNDS = 20;
const API_URL = 'https://honest-tuna-striking.ngrok-free.app/api/predict'; // Ensure this matches your backend

// --- Helper Components / Icons ---
const IconSun = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591" />
  </svg>
);

const IconMoon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

// Icon for the view counter
const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5 inline-block">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CHART_COLORS = {
  Activator: '#10B981',
  Inhibitor: '#F59E0B',
  Decoy: '#3B82F6',
  Error: '#EF4444',
};

const ACTIVATOR_CHART_COLORS = {
  bar: '#88BFE8',
  medianDot: '#FF6347'
};

const TYPE_ORDER = {
  'Activator': 1,
  'Inhibitor': 2,
  'Decoy': 3,
  'Error': 4
};



export default function Home() {
  const [textareaValue, setTextareaValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [percentage, setPercentage] = useState(95);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const [theme, setTheme] = useState('light');
  const [tableData, setTableData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activatorAC50Data, setActivatorAC50Data] = useState([]);
  const [particles, setParticles] = useState([]);
  const [pageViews, setPageViews] = useState(null); // State for the view counter


  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Contact us', path: '/contact' }
  ];




  useEffect(() => {
    if (results && results.classification_results) {
      const newTableData = Object.entries(results.classification_results).map(([smiles, classification]) => {
        let AC50Display = 'N/A';
        let rawPurityData = {};

        if (classification === 'Activator' && results.regression_results && results.regression_results[smiles]) {
          const regData = results.regression_results[smiles];
          if (regData.error) {
            AC50Display = regData.error;
          } else {
            const medianVal = regData.regression_AC50_median.toFixed(2);
            const lowerBound = regData.regression_AC50_lower_bound.toFixed(2);
            const upperBound = regData.regression_AC50_upper_bound.toFixed(2);
            AC50Display = `Median: ${medianVal}; Range: [ ${lowerBound} - ${upperBound} ]`;

            rawPurityData = {
              median: regData.regression_AC50_median,
              lower: regData.regression_AC50_lower_bound,
              upper: regData.regression_AC50_upper_bound,
            };
          }
        }
        return {
          smiles: smiles.startsWith("EMPTY_INPUT_") ? "(Empty Input)" : smiles,
          type: classification,
          AC50: AC50Display,
          _rawPurityData: rawPurityData
        };
      });

      newTableData.sort((a, b) => {
        const orderA = TYPE_ORDER[a.type] || 999;
        const orderB = TYPE_ORDER[b.type] || 999;
        return orderA - orderB;
      });
      setTableData(newTableData);

      const counts = { Activator: 0, Inhibitor: 0, Decoy: 0, Error: 0 };
      Object.values(results.classification_results).forEach(classificationValue => {
        const typeKey = String(classificationValue);
        if (CHART_COLORS[typeKey]) {
          counts[typeKey]++;
        } else if (typeKey.toLowerCase().includes("error")) {
          counts.Error++;
        } else {
          counts.Decoy = (counts.Decoy || 0) + 1;
        }
      });

      const newChartData = Object.entries(counts)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));
      setChartData(newChartData);

      const activatorSpecificData = newTableData
        .filter(item =>
          item.type === 'Activator' &&
          item._rawPurityData &&
          typeof item._rawPurityData.median === 'number' &&
          typeof item._rawPurityData.lower === 'number' &&
          typeof item._rawPurityData.upper === 'number'
        )
        .map((item, index) => ({
          name: `${index + 1}`,
          fullSmiles: item.smiles,
          range: [
            parseFloat(item._rawPurityData.lower.toFixed(2)),
            parseFloat(item._rawPurityData.upper.toFixed(2))
          ],
          median: parseFloat(item._rawPurityData.median.toFixed(2)),
        }));
      setActivatorAC50Data(activatorSpecificData);

    } else {
      setTableData([]);
      setChartData([]);
      setActivatorAC50Data([]);
    }
  }, [results]);

  const readFileContent = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        content: e.target.result,
        isBinary: !file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv'
      });
      reader.onerror = (err) => reject(new Error(`File reading error: ${err.message}`));

      if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  }, []);

  const parseFileContent = useCallback((fileContent, isBinary, fileName) => {
    let smilesFromFile = [];
    let localJsonSheet = [];
    try {
      const workbook = XLSX.read(fileContent, { type: isBinary ? 'binary' : 'string', cellNF: false, cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found in the file.");
      const worksheet = workbook.Sheets[sheetName];
      localJsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, blankrows: false });

      if (localJsonSheet.length > 0) {
        let startIndex = 0;
        const firstRowFirstCell = String(localJsonSheet[0][0] || "").trim().toLowerCase();
        if (localJsonSheet.length > 1 &&
          (firstRowFirstCell.includes("smiles") || firstRowFirstCell.includes("compound") || firstRowFirstCell.includes("molecule")) &&
          firstRowFirstCell.length < 50) {
          startIndex = 1;
        }

        smilesFromFile = localJsonSheet.slice(startIndex)
          .map(row => (row && row[0]) ? String(row[0]).trim() : "")
          .filter(s => s && s.length > 2 && !s.toLowerCase().includes("smiles") && !s.toLowerCase().includes("compound"));
      }
    } catch (error) {
      console.error("Error processing file with XLSX:", error);
      if (!isBinary && fileName.toLowerCase().endsWith('.csv')) {
        const rows = fileContent.split(/\r?\n/);
        let startIndex = 0;
        if (rows.length > 0) {
          const firstRowFirstCell = rows[0].split(/[,;\t]/)[0].trim().toLowerCase();
          if (rows.length > 1 &&
            (firstRowFirstCell.includes("smiles") || firstRowFirstCell.includes("compound") || firstRowFirstCell.includes("molecule")) &&
            firstRowFirstCell.length < 50) {
            startIndex = 1;
          }
          smilesFromFile = rows.slice(startIndex)
            .map(row => row.split(/[,;\t]/)[0] ? row.split(/[,;\t]/)[0].trim() : "")
            .filter(s => s && s.length > 2 && !s.toLowerCase().includes("smiles") && !s.toLowerCase().includes("compound"));
        }
      } else {
        throw new Error("Could not parse file. Ensure SMILES are in the first column of a valid Excel (xlsx, xls) or CSV file.");
      }
    }
    if (smilesFromFile.length === 0 && localJsonSheet && localJsonSheet.length > 0) {
      console.warn("File parsed but no valid SMILES extracted. Check first column and header logic.");
    }
    return smilesFromFile;
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['.csv', '.xls', '.xlsx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        setInputError('Invalid file type. Please upload CSV, XLS, or XLSX.');
        setSelectedFile(null); setFileName(''); event.target.value = null;
        return;
      }
      setSelectedFile(file); setFileName(file.name);
      setTextareaValue(''); setInputError(''); setResults(null);
    } else {
      setSelectedFile(null); setFileName('');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true); setResults(null); setInputError('');
    let smilesToProcess = [];

    if (selectedFile) {
      try {
        const fileData = await readFileContent(selectedFile);
        smilesToProcess = parseFileContent(fileData.content, fileData.isBinary, selectedFile.name);
        if (smilesToProcess.length === 0) {
          setInputError("No valid SMILES found in file. Check format (SMILES in first column, optional header).");
          setIsLoading(false); return;
        }
      } catch (error) {
        setInputError(error.message || "Failed to process file.");
        setIsLoading(false); return;
      }
    } else if (textareaValue.trim() !== "") {
      smilesToProcess = textareaValue.split(/[\n,]+/).map(s => s.trim()).filter(s => s);
    }

    if (smilesToProcess.length === 0) {
      setInputError("No SMILES input. Enter in textarea or upload file.");
      setIsLoading(false); return;
    }
    if (smilesToProcess.length > MAX_COMPOUNDS) {
      setInputError(`Max ${MAX_COMPOUNDS} compounds allowed. You provided ${smilesToProcess.length}.`);
      setIsLoading(false); return;
    }

    try {
      const payload = { compound: smilesToProcess, percentage: Number(percentage) };
      const res = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setResults({ error: data.error || `Server Error: ${res.status}` });
      else setResults(data);
    } catch (err) {
      setResults({ error: `Network/Parsing Error: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const clearInputs = () => {
    setTextareaValue(''); setSelectedFile(null); setFileName('');
    setInputError(''); setResults(null);
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) fileInput.value = null;
  };

  const escapeCSVField = (field) => {
    if (field === null || typeof field === 'undefined') return '';
    let stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
      stringField = stringField.replace(/"/g, '""');
      return `"${stringField}"`;
    }
    return stringField;
  };

  const handleExportCSV = () => {
    if (!tableData.length) return;

    const headers = ["Compound (SMILES)", "Modulator Type", "AC50 Range"];
    const csvRows = [
      headers.join(','),
      ...tableData.map(item => [
        escapeCSVField(item.smiles),
        escapeCSVField(item.type),
        escapeCSVField(item.AC50)
      ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'marc_results.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <nav className={` fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm' : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
          <div className="flex items-center justify-between h-16">
            {/* Logo and brand name - left side */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
                <img
                  src="logo.png"
                  alt="PKM2Pred Logo"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-cyan-900 dark:text-cyan-400">
                  PKM2Pred
                </span>
              </Link>
            </div>

            {/* Desktop navigation - right side */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.path}
                    className="text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-800">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.path}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <div className={`min-h-screen font-sans transition-colors duration-300 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-x-hidden pt-8`}>
        
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <header className="mb-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-3xl mx-auto"
            >
              <p className="text-base sm:text-sm text-gray-800 dark:text-gray-300 mt-4 leading-relaxed">
                PKM2Pred can batch classify PKM2 modulators into activators, inhibitors and decoys,
                and predict the range of the AC50 values of the corresponding activators
              </p>
            </motion.div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gray-800/70 backdrop-blur-md shadow-xl rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700"
          >
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="smilesInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter SMILES Strings
                </label>
                <textarea
                  id="smilesInput" rows={6}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-gray-50 dark:bg-gray-700 text-sm font-mono placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={`CCC,CCO\nCNC(=O)C1=CN=CN1\nMax ${MAX_COMPOUNDS} compounds, separated by comma or newline.`}
                  value={textareaValue}
                  onChange={(e) => { setTextareaValue(e.target.value); setSelectedFile(null); setFileName(''); setInputError(''); setResults(null); }}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Or Upload File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <IconUpload />
                      <label htmlFor="fileUpload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800 focus-within:ring-cyan-500 px-1">
                        <span>Upload a file</span>
                        <input id="fileUpload" name="fileUpload" type="file" className="sr-only"
                          accept=".csv, .xlsx, .xls" onChange={handleFileChange} disabled={isLoading} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">CSV, XLSX, XLS up to 1MB. SMILES in first column.</p>
                    {fileName && <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">Selected: {fileName}</p>}
                  </div>
                </div>
              </div>
            </div>

            {inputError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm">
                {inputError}
              </motion.div>
            )}

            <div className="mb-6">
              <label htmlFor="percentageSlider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confidence Interval ({percentage}%)
              </label>
              <input id="percentageSlider" type="range" min="1" max="99" step="1" value={percentage}
                onChange={(e) => setPercentage(e.target.value)} disabled={isLoading}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500 dark:accent-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                onClick={handleSubmit}
                disabled={isLoading || (!textareaValue.trim() && !selectedFile)}
                className={`w-full sm:w-auto flex-grow py-3 px-6 rounded-md font-semibold text-base transition-all duration-300 ease-in-out
                            text-white disabled:opacity-50 disabled:cursor-not-allowed
                            ${isLoading
                    ? 'bg-cyan-500 dark:bg-cyan-600 animate-pulse'
                    : 'bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-700 dark:hover:bg-cyan-400'
                  }
                            focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-cyan-500`}
                whileHover={{ scale: isLoading ? 1 : 1.03 }}
                whileTap={{ scale: isLoading ? 1 : 0.97 }}
                animate={isLoading ? {
                  boxShadow: ["0 0 0px 0px rgba(6,182,212,0.0)", "0 0 8px 2px rgba(6,182,212,0.7)", "0 0 0px 0px rgba(6,182,212,0.0)"],
                } : {}}
                transition={isLoading ? { duration: 1.5, repeat: Infinity, ease: "linear" } : { duration: 0.15 }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                    Analyzing...
                  </div>
                ) : 'Predict'}
              </motion.button>
              <button onClick={clearInputs} disabled={isLoading}
                className="w-full sm:w-auto py-3 px-6 rounded-md font-semibold text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50">
                Clear All
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {isLoading && !results && (
              <motion.div
                key="loadingResults"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-8 text-center text-gray-500 dark:text-gray-400">
                Fetching results, please wait...
              </motion.div>
            )}
            {results && (
              <motion.div
                key="resultsContent"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-10 bg-white dark:bg-gray-800/70 backdrop-blur-md shadow-xl rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700"
              >
                {results.error && (
                  <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-300">
                    <h3 className="text-lg font-semibold mb-1">API Error</h3>
                    <p className="text-sm">{results.error}</p>
                  </div>
                )}

                {tableData.length > 0 && !results.error && (
                  <div className="mb-8">
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Results Summary</h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sl. No.</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Compound (SMILES)</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Modulator Type</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">AC50 Range</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {tableData.map((item, index) => (
                            <tr key={item.smiles + index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{index + 1}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-700 dark:text-gray-300 break-all max-w-xs truncate" title={item.smiles}>{item.smiles}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${item.type === "Activator" ? "bg-green-100 dark:bg-green-700/30 text-green-800 dark:text-green-300" :
                                    item.type === "Inhibitor" ? "bg-amber-100 dark:bg-amber-700/30 text-amber-800 dark:text-amber-300" :
                                      item.type === "Decoy" ? "bg-blue-100 dark:bg-blue-700/30 text-blue-800 dark:text-blue-300" :
                                        "bg-red-100 dark:bg-red-700/30 text-red-800 dark:text-red-300"}`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-xs ${item.type === 'Activator' && !item.AC50.toLowerCase().includes("error") && !item.AC50.toLowerCase().includes("n/a") ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                {item.AC50}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(chartData.length > 0 || activatorAC50Data.length > 0) && !results.error && (
                  <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {chartData.length > 0 && (
                      <div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Distribution</h3>
                        <div style={{ width: '100%', height: 350 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                                  const RADIAN = Math.PI / 180;
                                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                  const textAnchor = x > cx ? 'start' : 'end';
                                  return (
                                    <text x={x} y={y} fill={theme === 'dark' ? '#fff' : '#000'} textAnchor={textAnchor} dominantBaseline="central" fontSize="14px" fontWeight="bold">
                                      {`${name}: ${(percent * 100).toFixed(0)}% (${value})`}
                                    </text>
                                  );
                                }}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name] || '#82ca9d'}
                                    stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(value, name) => [`${value} compound(s)`, name]}
                                contentStyle={theme === 'dark' ? { backgroundColor: '#374151', borderColor: '#4B5563' } : { backgroundColor: '#ffffff', borderColor: '#D1D5DB' }}
                                itemStyle={theme === 'dark' ? { color: '#D1D5DB' } : { color: '#000000' }}
                                cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    {activatorAC50Data.length > 0 && (
                      <div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Predicted AC50 Ranges</h3>
                        <div style={{ width: '100%', height: Math.max(350, activatorAC50Data.length * 35 + 70) }}>
                          <ResponsiveContainer>
                            <ComposedChart
                              layout="vertical"
                              data={activatorAC50Data}
                              margin={{ top: 5, right: 30, left: 10, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke={theme === 'dark' ? "#4B5563" : "#E5E7EB"} />
                              <XAxis type="number" domain={['auto', 'auto']} allowDataOverflow
                                tick={{ fontSize: 10, fill: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
                                stroke={theme === 'dark' ? '#4B5563' : '#D1D5DB'}
                              />
                              <YAxis dataKey="name" type="category" width={50} interval={0}
                                tick={{ fontSize: 10, fill: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
                                stroke={theme === 'dark' ? '#4B5563' : '#D1D5DB'}
                              />
                              <RechartsTooltip
                                formatter={(value, name, entry) => {
                                  if (name === "AC50 Range") {
                                    return [`${value[0]} - ${value[1]}`, name];
                                  }
                                  if (name === "Median AC50") {
                                    return [value, name];
                                  }
                                  return [value, name];
                                }}
                                labelFormatter={(label) => `Activator #${label}`}
                                contentStyle={theme === 'dark' ? {
                                  backgroundColor: '#374151',
                                  borderColor: '#4B5563',
                                  borderRadius: '0.5rem'
                                } : {
                                  backgroundColor: '#ffffff',
                                  borderColor: '#D1D5DB',
                                  borderRadius: '0.5rem'
                                }}
                                itemStyle={theme === 'dark' ? { color: '#D1D5DB' } : { color: '#1F2937' }}
                                labelStyle={theme === 'dark' ? {
                                  color: '#E5E7EB',
                                  marginBottom: '4px',
                                  fontWeight: 'bold',
                                  fontSize: '11px'
                                } : {
                                  color: '#374151',
                                  marginBottom: '4px',
                                  fontWeight: 'bold',
                                  fontSize: '11px'
                                }}
                                cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                iconSize={10}
                                payload={[
                                  { value: 'AC50 Range', type: 'square', id: 'ID01', color: ACTIVATOR_CHART_COLORS.bar },
                                  { value: 'Median AC50', type: 'circle', id: 'ID02', color: ACTIVATOR_CHART_COLORS.medianDot }
                                ]}
                              />
                              <Bar dataKey="range" name="AC50 Range" fill={ACTIVATOR_CHART_COLORS.bar} barSize={25} radius={[3, 3, 3, 3]} />
                              <Scatter dataKey="median" name="Median AC50" fill={ACTIVATOR_CHART_COLORS.medianDot} shape={<circle r={4} />} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {results.batch_processing_errors && results.batch_processing_errors.length > 0 && !results.error && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">SMILES Processing Errors:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-200 dark:border-gray-600">
                      {results.batch_processing_errors.map((err, index) => (
                        <div key={`batch-err-${index}`} className="text-xs text-red-700 dark:text-red-300">
                          <p className="break-all"><strong>Input:</strong> "{err.smiles || err.input_smiles || "(unknown)"}" - <strong>Error:</strong> {err.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tableData.length === 0 && chartData.length === 0 && activatorAC50Data.length === 0 && !results.error && !isLoading && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">No results to display. Submit SMILES for analysis.</p>
                )}

                {tableData.length > 0 && !results.error && (
                  <div className="mt-8 text-center sm:text-right">
                    <button
                      onClick={handleExportCSV}
                      disabled={isLoading}
                      className="py-2 px-5 rounded-md font-semibold text-sm bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
                    >
                      Export Results as CSV
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </>
  );
}