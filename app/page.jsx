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
// const API_BASE_URL = 'https://honest-tuna-striking.ngrok-free.app/api';
const API_BASE_URL = 'http://127.0.0.1:5000/api';
const API_URL = `${API_BASE_URL}/predict`;
const CHECK_USER_URL = `${API_BASE_URL}/check-user`;
const REGISTER_USER_URL = `${API_BASE_URL}/register-user`;

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
  const [userEmail, setUserEmail] = useState('');
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isEmailSubmission, setIsEmailSubmission] = useState(false);
  
  // User registration states
  const [userExists, setUserExists] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAffiliation, setUserAffiliation] = useState('');
  const [registrationError, setRegistrationError] = useState('');

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
    { name: 'Predict', path: '/' },
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

        // Get descriptor values for this compound
        const descriptors = results.descriptors_results && results.descriptors_results[smiles] 
          ? results.descriptors_results[smiles] 
          : {};
        
        // Replace NaN with 0.0000 and format to 4 decimal places
        const formattedDescriptors = {};
        Object.keys(descriptors).forEach(key => {
          const value = descriptors[key];
          formattedDescriptors[key] = (value === null || value === undefined || isNaN(value)) 
            ? '0.0000' 
            : typeof value === 'number' ? value.toFixed(4) : '0.0000';
        });

        return {
          smiles: smiles.startsWith("EMPTY_INPUT_") ? "(Empty Input)" : smiles,
          type: classification,
          AC50: AC50Display,
          _rawPurityData: rawPurityData,
          descriptors: formattedDescriptors
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

  const checkUserInDatabase = async (email) => {
    try {
      const res = await fetch(CHECK_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking user:', error);
      return false;
    }
  };

  const registerNewUser = async (email, name, affiliation) => {
    try {
      const res = await fetch(REGISTER_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, affiliation }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to register user.' };
      }
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true); setResults(null); setInputError(''); setEmailSent(false); setIsEmailSubmission(false);
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
    
    // Check if manual input exceeds 20 molecules
    if (!selectedFile && smilesToProcess.length > MAX_COMPOUNDS) {
      setInputError(`Manual input is limited to ${MAX_COMPOUNDS} compounds. You provided ${smilesToProcess.length}. Please upload a CSV file for larger batches.`);
      setIsLoading(false); return;
    }
    
    // Check if file input exceeds 20 molecules - show email prompt
    if (selectedFile && smilesToProcess.length > MAX_COMPOUNDS) {
      if (!userEmail || !userEmail.includes('@')) {
        setShowEmailPrompt(true);
        setInputError(`Your file contains ${smilesToProcess.length} compounds (more than ${MAX_COMPOUNDS}). Please enter your email address to receive the results.`);
        setIsLoading(false);
        return;
      }
      
      // Check if user exists in database
      const exists = await checkUserInDatabase(userEmail);
      if (!exists) {
        // User doesn't exist, show registration form
        setShowRegistrationForm(true);
        setInputError(`Email not found in our database. Please provide your name and affiliation to register.`);
        setIsLoading(false);
        return;
      }
      
      // Set flag to indicate this is an email submission
      setIsEmailSubmission(true);
    }

    // Check if large batch and email is required
    const isLargeBatch = smilesToProcess.length > MAX_COMPOUNDS;

    try {
      const payload = { 
        compound: smilesToProcess, 
        percentage: Number(percentage),
        email: (selectedFile && smilesToProcess.length > MAX_COMPOUNDS) ? userEmail : undefined
      };
      
      const res = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setResults({ error: data.error || `Server Error: ${res.status}` });
        setIsLoading(false);
        setIsEmailSubmission(false);
      } else {
        // Check if email was sent for large batch
        if (data.email_sent) {
          // Update results to show completion
          setResults({ 
            email_sent: true, 
            message: 'Processing completed successfully! Results will be sent to your email shortly.',
            completionMessage: 'Check your inbox for the detailed results CSV file.',
            compound_count: data.compound_count,
            recipient_email: data.recipient_email,
            isProcessing: false
          });
          setEmailSent(true);
          setIsLoading(false);
          setIsEmailSubmission(false);
        } else {
          setResults(data);
          setIsLoading(false);
          setIsEmailSubmission(false);
        }
      }
    } catch (err) {
      setResults({ error: `Network/Parsing Error: ${err.message}` });
      setIsLoading(false);
      setIsEmailSubmission(false);
    }
  };

  const handleRegistration = async () => {
    // Validate inputs
    if (!userName.trim() || !userAffiliation.trim()) {
      setRegistrationError('Please fill in all fields.');
      return;
    }
    
    setRegistrationError('');
    setIsLoading(true);
    
    // Register user
    const result = await registerNewUser(userEmail, userName, userAffiliation);
    if (result.success) {
      // Registration successful, hide form and proceed with submission
      setShowRegistrationForm(false);
      setUserExists(true);
      setInputError('');
      // Automatically proceed with compound processing
      handleSubmit();
    } else {
      setRegistrationError(result.error || 'Failed to register. Please try again.');
      setIsLoading(false);
    }
  };

  const clearInputs = () => {
    setTextareaValue(''); setSelectedFile(null); setFileName('');
    setInputError(''); setResults(null);
    setUserEmail(''); setShowEmailPrompt(false); setEmailSent(false);
    setShowRegistrationForm(false); setUserName(''); setUserAffiliation('');
    setRegistrationError(''); setUserExists(false);
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

    const descriptorHeaders = [
      'nN', 'nX', 'AATS2i', 'nBondsD', 'nBondsD2', 'C1SP2', 'C3SP2', 'SCH-5',
      'nHssNH', 'ndssC', 'nssNH', 'SdssC', 'SdS', 'mindO', 'mindS', 'minssS',
      'maxdssC', 'ETA_dAlpha_B', 'MDEN-23', 'n5Ring', 'nT5Ring', 'nHeteroRing',
      'n5HeteroRing', 'nT5HeteroRing', 'SRW5', 'SRW7', 'SRW9', 'WTPT-5'
    ];
    
    const headers = ["Compound (SMILES)", "Modulator Type", "AC50 Range", ...descriptorHeaders];
    const csvRows = [
      headers.join(','),
      ...tableData.map(item => {
        const descriptorValues = descriptorHeaders.map(header => 
          escapeCSVField(item.descriptors?.[header] || '0.0000')
        );
        return [
          escapeCSVField(item.smiles),
          escapeCSVField(item.type),
          escapeCSVField(item.AC50),
          ...descriptorValues
        ].join(',');
      })
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

            {showEmailPrompt && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mb-6"
              >
                <label htmlFor="emailInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address (for large batch results)
                </label>
                <input
                  id="emailInput"
                  type="email"
                  placeholder="your.email@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-gray-50 dark:bg-gray-700 text-sm placeholder-gray-400 dark:placeholder-gray-500"
                />
              </motion.div>
            )}

            {showRegistrationForm && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg"
              >
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">
                  New User Registration
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  We need a few more details to register you in our database.
                </p>
                
                {registrationError && (
                  <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
                    {registrationError}
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="userNameInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      id="userNameInput"
                      type="text"
                      placeholder="John Doe"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      disabled={isLoading}
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-sm placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="userAffiliationInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Affiliation *
                    </label>
                    <input
                      id="userAffiliationInput"
                      type="text"
                      placeholder="University/Organization"
                      value={userAffiliation}
                      onChange={(e) => setUserAffiliation(e.target.value)}
                      disabled={isLoading}
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-sm placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  
                  <button
                    onClick={handleRegistration}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Registering...' : 'Register & Continue'}
                  </button>
                </div>
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
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-700 dark:hover:bg-cyan-400'
                  }
                            focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-cyan-500`}
                whileHover={{ scale: isLoading ? 1 : 1.03 }}
                whileTap={{ scale: isLoading ? 1 : 0.97 }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                    {isEmailSubmission ? 'Processing & Sending...' : 'Analyzing...'}
                  </div>
                ) : 'Predict'}
              </motion.button>
              <button onClick={clearInputs} disabled={isLoading}
                className="w-full sm:w-auto py-3 px-6 rounded-md font-semibold text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Clear All
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {isLoading && !emailSent && (
              <motion.div
                key="loadingResults"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mt-8 p-6 rounded-lg border-2 ${
                  isEmailSubmission 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                }`}>
                <div className="flex items-center justify-center mb-3">
                  <div className={`w-8 h-8 border-3 rounded-full animate-spin mr-3 ${
                    isEmailSubmission 
                      ? 'border-amber-500/30 border-t-amber-500' 
                      : 'border-blue-500/30 border-t-blue-500'
                  }`} />
                  <h3 className={`text-lg font-semibold ${
                    isEmailSubmission 
                      ? 'text-amber-700 dark:text-amber-300' 
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {isEmailSubmission ? 'Processing Your Compounds...' : 'Analyzing Compounds...'}
                  </h3>
                </div>
                <p className={`text-center text-sm mb-2 ${
                  isEmailSubmission 
                    ? 'text-amber-700 dark:text-amber-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {isEmailSubmission 
                    ? 'Your compounds are being processed. This may take a few moments...'
                    : 'Please wait while we analyze your compounds...'}
                </p>
                {isEmailSubmission && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-amber-200 dark:border-amber-700">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Results will be sent to <span className="font-semibold">{userEmail}</span> upon completion.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {results && !isLoading && (
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

                {results.email_sent && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ duration: 0.3 }}
                    className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg shadow-lg"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">
                          ✓ Processing Complete!
                        </h3>
                        <div className="space-y-2">
                          <p className="text-base text-green-700 dark:text-green-400 mb-3">
                            <strong>Status:</strong> {results.message}
                          </p>
                          <div className="rounded-md p-4 border bg-white dark:bg-gray-800 border-green-200 dark:border-green-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Compounds:</span>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">{results.compound_count}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">{results.recipient_email}</span>
                              </div>
                            </div>
                          </div>
                          {results.completionMessage && (
                            <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                              <strong>Next Step:</strong> {results.completionMessage}
                            </p>
                          )}
                          <div className="mt-3 p-3 rounded bg-green-100 dark:bg-green-900/30">
                            <p className="font-medium text-sm text-green-800 dark:text-green-300">
                              What happens next?
                            </p>
                            <ul className="mt-1 text-xs list-disc list-inside space-y-1 text-green-700 dark:text-green-400">
                              <li>Processing has been completed successfully</li>
                              <li>Results email will be sent shortly to {results.recipient_email}</li>
                              <li>You can safely close this page</li>
                              <li>Check your email for the CSV file with detailed results</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {tableData.length > 0 && !results.error && !results.email_sent && (
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
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nN</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nX</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">AATS2i</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nBondsD</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nBondsD2</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">C1SP2</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">C3SP2</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SCH-5</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nHssNH</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ndssC</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nssNH</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SdssC</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SdS</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">mindO</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">mindS</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">minssS</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">maxdssC</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ETA_dAlpha_B</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MDEN-23</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">n5Ring</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nT5Ring</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nHeteroRing</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">n5HeteroRing</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">nT5HeteroRing</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SRW5</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SRW7</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SRW9</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">WTPT-5</th>
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
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nN || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nX || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.AATS2i || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nBondsD || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nBondsD2 || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.C1SP2 || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.C3SP2 || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.['SCH-5'] || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nHssNH || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.ndssC || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nssNH || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.SdssC || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.SdS || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.mindO || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.mindS || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.minssS || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.maxdssC || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.ETA_dAlpha_B || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.['MDEN-23'] || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.n5Ring || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nT5Ring || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nHeteroRing || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.n5HeteroRing || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.nT5HeteroRing || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.SRW5 || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.SRW7 || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.SRW9 || '0.0000'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{item.descriptors?.['WTPT-5'] || '0.0000'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(chartData.length > 0 || activatorAC50Data.length > 0) && !results.error && !results.email_sent && (
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

                {tableData.length === 0 && chartData.length === 0 && activatorAC50Data.length === 0 && !results.error && !results.email_sent && !isLoading && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">No results to display. Submit SMILES for analysis.</p>
                )}

                {tableData.length > 0 && !results.error && !results.email_sent && (
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