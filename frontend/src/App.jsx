import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
    Stethoscope,
    User,
    Pill,
    Shield,
    Lock,
    Zap,
    CheckCircle,
    ArrowRight,
    Github,
    Twitter,
    Linkedin,
    Heart,
    Activity,
    Database,
    Wallet,
    Network,
    FileText  ,
    UserPlus 
} from 'lucide-react';

// Import your existing dashboard components
import DoctorDashboard from './components/doctor/DoctorDashboard';
import PatientDashboard from './components/patient/PatientDashboard';
import PharmacyDashboard from './components/pharmacy/PharmacyDashboard';
import { ContractService } from './services/contractService'; // Ensure this path is correct

function App() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState('unconnected');
    const [activeTab, setActiveTab] = useState('landing');
    const [isAnimated, setIsAnimated] = useState(false);

    // Animation trigger for initial fade-in effect on page load
    useEffect(() => {
        setIsAnimated(true);
    }, []);

    // Function to connect to the MetaMask wallet
    const connectWallet = async () => {
        try {
            setLoading(true); // Set loading state to true while connecting

            // Check if MetaMask or a similar Ethereum provider is available in the browser
            if (!window.ethereum) {
                alert('Please install MetaMask to use this application');
                return; // Exit if no provider is found
            }

            // Request user's accounts from MetaMask
            await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            // Initialize ethers.js provider and signer
            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const web3Signer = await web3Provider.getSigner();
            const connectedAccount = await web3Signer.getAddress(); // Get the connected wallet address

            // Update state with connected wallet information
            setProvider(web3Provider);
            setSigner(web3Signer);
            setAccount(connectedAccount);
            setIsConnected(true); // Mark wallet as connected

            console.log('✅ Wallet connected:', connectedAccount);

        } catch (error) {
            console.error('❌ Error connecting wallet:', error);
            alert('Failed to connect wallet. Please try again.'); // User-friendly alert on error
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    // Function to disconnect the wallet
    const disconnectWallet = () => {
        setProvider(null);
        setSigner(null);
        setAccount('');
        setIsConnected(false);
        setUserRole('unconnected'); // Reset user role
        setActiveTab('landing'); // Return to the landing page
        console.log('👋 Wallet disconnected');
    };

    // Effect hook to determine the user's role (Doctor, Patient, Pharmacist, or Unknown)
    // This interacts with your ContractService to query the blockchain.
    useEffect(() => {
        const determineRole = async () => {
            if (!signer || !account) {
                setUserRole('unconnected'); // No signer or account, so user is unconnected
                return;
            }

            try {
                // Ensure ContractService is initialized with a valid signer
                const contractService = new ContractService(signer);

                // Check if the connected account is a verified doctor
                const isVerifiedDoctor = await contractService.doctorRegistry.isVerifiedDoctor(account);
                if (isVerifiedDoctor) {
                    setUserRole('doctor');
                    console.log('User role: Doctor');
                    return;
                }

                // Check if the connected account is a verified pharmacy
                const isVerifiedPharmacy = await contractService.pharmacyRegistry.isVerifiedPharmacy(account);
                if (isVerifiedPharmacy) {
                    setUserRole('pharmacist');
                    console.log('User role: Pharmacist');
                    return;
                }

                // Check if the connected account has any prescriptions as a patient
                // Note: The getPatientPrescriptionIds method might return an empty array if no prescriptions
                const patientPrescriptionIds = await contractService.prescriptionRegistry.getPatientPrescriptionIds(account);
                if (patientPrescriptionIds && patientPrescriptionIds.length > 0) {
                    setUserRole('patient');
                    console.log('User role: Patient');
                    return;
                }

                setUserRole('unknown'); // If none of the above roles, mark as unknown
                console.log('User role: Unknown');
            } catch (error) {
                console.error("Error determining user role:", error);
                setUserRole('unknown'); // Handle errors during role determination
            }
        };

        determineRole(); // Call the role determination function when signer or account changes
    }, [signer, account]); // Dependencies for this effect

    // Effect hook to check for existing wallet connection on page load
    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum) {
                try {
                    // Request currently connected accounts without prompting the user
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts'
                    });

                    // If accounts are found, attempt to connect
                    if (accounts.length > 0) {
                        await connectWallet();
                    }
                } catch (error) {
                    console.error('Error checking wallet connection:', error);
                }
            }
        };
        checkConnection(); // Call the connection check on component mount
    }, []); // Empty dependency array means this runs once on mount

    // Effect hook to listen for changes in MetaMask accounts or network chain
    useEffect(() => {
        if (window.ethereum) {
            // Handler for when connected accounts change
            const handleAccountsChanged = (accounts) => {
                if (accounts.length === 0) {
                    disconnectWallet(); // Disconnect if no accounts are connected
                } else {
                    // Reconnect if accounts are present (e.g., user switched accounts)
                    // This will also re-trigger role determination via the other useEffect
                    connectWallet();
                }
            };

            // Handler for when the Ethereum chain changes
            const handleChainChanged = () => {
                window.location.reload(); // Reload the page to ensure correct network interaction
            };

            // Subscribe to MetaMask events
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            // Cleanup function: unsubscribe from events when the component unmounts
            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

    // Wrapper component for dashboards to maintain consistent header and layout
    const DashboardWrapper = ({ children }) => (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
            <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 py-3 sm:py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <button
                            onClick={() => setActiveTab('landing')}
                            className="flex items-center space-x-2 text-white hover:text-cyan-300 transition-colors"
                        >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                                <FileText  className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-lg sm:text-xl font-bold">DPVS</span>
                        </button>

                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <span className="text-xs sm:text-sm text-gray-300 flex items-center">
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-green-400" />
                                {account.slice(0, 4)}...{account.slice(-2)}
                            </span>
                            <button
                                onClick={disconnectWallet}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors backdrop-blur-sm border border-red-500/30"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow">
                {children}
            </main>
        </div>
    );

    // Conditional rendering of dashboards based on the active tab
    if (activeTab === 'doctor') {
        return (
            <DashboardWrapper>
                {/* Pass signer and account props to DoctorDashboard for blockchain interaction */}
                <DoctorDashboard signer={signer} account={account} />
            </DashboardWrapper>
        );
    }

    if (activeTab === 'patient') {
        return (
            <DashboardWrapper>
                {/* Pass signer and account props to PatientDashboard */}
                <PatientDashboard signer={signer} account={account} />
            </DashboardWrapper>
        );
    }

    if (activeTab === 'pharmacy') {
        return (
            <DashboardWrapper>
                {/* Pass signer and account props to PharmacyDashboard */}
                <PharmacyDashboard signer={signer} account={account} />
            </DashboardWrapper>
        );
    }

    // Landing Page Content (when activeTab is 'landing' or not connected)
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
            {/* Animated Background Elements - for visual flair */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
                {/* Note: The middle pink blurring background element was removed as requested in previous iterations */}
            </div>

            {/* Header Section */}
            <header className="relative z-10 bg-white/5 backdrop-blur-lg border-b border-white/10 py-3 sm:py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                                <FileText   className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-white">DPVS</h1>
                                <p className="md:text-sm text-[9px]  text-gray-300">Decentralized Prescription Verification System</p>
                            </div>
                        </div>

                        {/* Navigation links - hidden on small screens, shown on medium and up */}
                        <nav className="hidden md:flex items-center space-x-6 sm:space-x-8">
                            <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Features</a>
                            <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">How It Works</a>
                            <a href="#metamask-setup" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">MetaMask Setup</a>
                        </nav>

                        {/* Wallet connection button or connected account display */}
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            {!isConnected ? (
                                <button
                                    onClick={connectWallet}
                                    disabled={loading}
                                    className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center text-sm sm:text-base"
                                >
                                    {loading ? 'Connecting...' : <><Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Connect Wallet</>}
                                </button>
                            ) : (
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs sm:text-sm text-gray-300 flex items-center">
                                        <CheckCircle className="w-3 h-3 sm:w-4 h-4 mr-1 text-green-400" />
                                        {account.slice(0, 4)}...{account.slice(-2)}
                                    </span>
                                    <button
                                        onClick={disconnectWallet}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            {/* Reduced py and pb from large to medium */}
           
{/* Hero Section */}


<section className="relative z-10 py-12 sm:py-16 sm:pb-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`transition-all duration-1000 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-emerald-200 to-teal-400 bg-clip-text text-transparent">
                Prevent Prescription Fraud
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-3 sm:mb-4">
                Securely. Transparently. Decentralized.
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto">
                DPVS revolutionizes healthcare by securing digital prescriptions on the blockchain,
                preventing forgery and ensuring authentic medical care for everyone.
            </p>

            {!isConnected ? (
                <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-base sm:text-lg font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Connecting...' : (
                        <>
                            {/* Simple Wallet Icon */}
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Get Started
                        </>
                    )}
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            ) : (
                <div className="w-full max-w-4xl mx-auto">
                    {/* Connected Wallet Display - Improved Responsive Layout */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 sm:p-6 transform hover:scale-[1.02] transition-all duration-300 hover:bg-white/15">
                        
                        {/* Mobile Layout (Stack Vertically) */}
                        <div className="block lg:hidden space-y-4">
                            {/* Connection Status Row */}
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center">
                                    <div className="relative mr-2">
                                        <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                                        <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                    </div>
                                    <span className="text-green-400 font-medium text-sm">Connected</span>
                                </div>
                                <div className="flex items-center text-xs text-purple-400">
                                    <Network className="w-3 h-3 mr-1" />
                                    Polygon Amoy
                                </div>
                            </div>

                            {/* Wallet Address Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    {/* Simple Wallet Icon */}
                                    <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <code className="text-white font-mono text-sm block">
                                            {account.slice(0, 6)}...{account.slice(-4)}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(account)}
                                            className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center mt-1"
                                        >
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWeight={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* User Role Badge */}
                                {userRole !== 'unconnected'  && (
                                    <div className="flex items-center">
                                        {userRole === 'doctor' && (
                                            <div className="flex items-center bg-cyan-500/20 px-4 py-2.5 rounded-lg">
                                                <Stethoscope className="w-3 h-3 text-cyan-400 mr-1" />
                                                <span className="text-cyan-400 text-xs font-medium">Doctor</span>
                                            </div>
                                        )}
                                        {userRole === 'patient' && (
                                            <div className="flex items-center bg-purple-500/20 px-4 py-2.5 rounded-lg">
                                                <User className="w-3 h-3 text-purple-400 mr-1" />
                                                <span className="text-purple-400 text-xs font-medium">Patient</span>
                                            </div>
                                        )}
                                        {userRole === 'pharmacist' && (
                                            <div className="flex items-center bg-green-500/20 px-4 py-2.5 rounded-lg">
                                                <Pill className="w-3 h-3 text-green-400 mr-1" />
                                                <span className="text-green-400 text-xs font-medium">Pharmacist</span>
                                            </div>
                                        )}
                                       {userRole === 'unknown' && (
    <div className="flex items-center bg-gray-500/20 px-4 py-2.5 rounded-lg">
        <UserPlus className="w-3 h-3 text-gray-400 mr-1" />
        <span className="text-gray-400 text-xs font-medium">New User</span>
    </div>
)}

                                    </div>
                                )}
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        if (userRole === 'doctor') setActiveTab('doctor');
                                        else if (userRole === 'patient') setActiveTab('patient');
                                        else if (userRole === 'pharmacist') setActiveTab('pharmacy');
                                        else {
                                            document.getElementById('choose-role')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
                                >
                                    {userRole === 'doctor' && <><Stethoscope className="w-4 h-4 mr-1" /> Issue Prescriptions</>}
                                    {userRole === 'patient' && <><User className="w-4 h-4 mr-1" /> Access your Prescriptions</>}
                                    {userRole === 'pharmacist' && <><Pill className="w-4 h-4 mr-1" />Verify Prescriptions</>}
                                    {(userRole === 'unknown' || userRole === 'unconnected') && <><ArrowRight className="w-4 h-4 mr-1" /> Choose Role</>}
                                </button>
                                
                                <button
                                    onClick={disconnectWallet}
                                    className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Desktop Layout (Horizontal) */}
                        <div className="hidden lg:flex items-center justify-between">
                            {/* Left: Wallet Info */}
                            <div className="flex items-center space-x-4">
                                {/* Simple Wallet Icon */}
                                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                
                                <div>
                                    <div className="flex items-center mb-1">
                                        <div className="relative mr-2">
                                            <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                                            <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                        </div>
                                        <span className="text-green-400 font-medium text-sm">Wallet Connected</span>
                                    </div>
                                    
                                    <div className="flex items-center">
                                        <code className="text-white font-mono text-sm mr-3">
                                            {account.slice(0, 8)}...{account.slice(-6)}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(account)}
                                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                            title="Copy address"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Center: User Role & Network */}
                            <div className="flex items-center space-x-4">
                                {/* User Role */}
                                {userRole !== 'unconnected'  && (
                                    <div className="flex items-center">
                                        {userRole === 'doctor' && (
                                            <div className="flex items-center bg-cyan-500/20 px-5 py-2.5 rounded-lg">
                                                <Stethoscope className="w-4 h-4 text-cyan-400 mr-2" />
                                                <span className="text-cyan-400 font-medium text-sm">Verified Doctor</span>
                                            </div>
                                        )}
                                        {userRole === 'patient' && (
                                            <div className="flex items-center bg-purple-500/20 px-5 py-2.5 rounded-lg">
                                                <User className="w-4 h-4 text-purple-400 mr-2" />
                                                <span className="text-purple-400 font-medium text-sm">Patient</span>
                                            </div>
                                        )}
                                        {userRole === 'pharmacist' && (
                                            <div className="flex items-center bg-green-500/20 px-5 py-2.5 rounded-lg">
                                                <Pill className="w-4 h-4 text-green-400 mr-2" />
                                                <span className="text-green-400 font-medium text-sm">Verified Pharmacist</span>
                                            </div>
                                        )}
                                        {userRole === 'unknown' && (
    <div className="flex items-center bg-gray-500/20 px-5 py-2.5 rounded-lg">
        <UserPlus className="w-3 h-3 text-gray-400 mr-1" />
        <span className="text-gray-400 text-sm font-medium">New User</span>
    </div>
)}
                                    </div>
                                )}

                               
                            </div>

                            {/* Right: Action Buttons */}
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => {
                                        if (userRole === 'doctor') setActiveTab('doctor');
                                        else if (userRole === 'patient') setActiveTab('patient');
                                        else if (userRole === 'pharmacist') setActiveTab('pharmacy');
                                        else {
                                            document.getElementById('choose-role')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
                                >
                                    {userRole === 'doctor' && <><Stethoscope className="w-4 h-4 mr-2" />Issue Prescriptions</>}
                                    {userRole === 'patient' && <><User className="w-4 h-4 mr-2" /> Your Prescriptions</>}
                                    {userRole === 'pharmacist' && <><Pill className="w-4 h-4 mr-2" /> Verify Prescriptions</>}
                                    {(userRole === 'unknown' || userRole === 'unconnected') && <><ArrowRight className="w-4 h-4 mr-2" /> Choose Role</>}
                                </button>
                                
                                <button
                                    onClick={disconnectWallet}
                                    className="inline-flex items-center px-4 py-2.5 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/40"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Disconnect
                                </button>
                            </div>
                        </div>

                        {/* Security Badge - Always at Bottom */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-center text-xs text-gray-400">
                                <Shield className="w-3 h-3 mr-2 text-green-400" />
                                <span>Secured by Blockchain Technology</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
</section>
            {/* User Dashboards Section - conditionally rendered */}
            {isConnected && (userRole === 'unknown' || userRole === 'unconnected') && (
    <section className="relative z-10 py-12 sm:py-16" id="choose-role">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Choose Your Role</h2>
                <p className="text-lg sm:text-xl text-gray-300">Access your personalized dashboard</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-7">
                {/* Doctor Dashboard Link */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10 hover:border-cyan-500/50 transition-all duration-300 group cursor-pointer transform hover:scale-105"
                    onClick={() => setActiveTab('doctor')}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                        <Stethoscope className="w-7 h-7 sm:w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Doctor Dashboard</h3>
                    <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-5">Issue secure prescriptions, verify patients, and manage your practice with blockchain security.</p>
                    <div className="flex items-center text-cyan-400 font-semibold group-hover:text-cyan-300 text-sm sm:text-base">
                        Login as Doctor <ArrowRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 h-5" />
                    </div>
                </div>

                {/* Patient Dashboard Link */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer transform hover:scale-105"
                    onClick={() => setActiveTab('patient')}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                        <User className="w-7 h-7 sm:w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Patient Dashboard</h3>
                    <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-5">View your prescriptions, share QR codes with pharmacists, and track your health data securely.</p>
                    <div className="flex items-center text-purple-400 font-semibold group-hover:text-purple-300 text-sm sm:text-base">
                        Access My Prescriptions <ArrowRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 h-5" />
                    </div>
                </div>

                {/* Pharmacy Dashboard Link */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10 hover:border-green-500/50 transition-all duration-300 group cursor-pointer transform hover:scale-105"
                    onClick={() => setActiveTab('pharmacy')}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                        <Pill className="w-7 h-7 sm:w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Pharmacy Dashboard</h3>
                    <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-5">Scan QR codes to instantly verify prescription authenticity and mark fulfillments on the blockchain.</p>
                    <div className="flex items-center text-green-400 font-semibold group-hover:text-green-300 text-sm sm:text-base">
                        Verify Prescription <ArrowRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>
    </section>
)}

            {/* Features Section */}
            {/* Reduced py */}
            <section id="features" className="relative z-10 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10 sm:mb-14"> {/* Adjusted mb */}
                        <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Secure Healthcare Revolution</h2>
                        <p className="text-lg sm:text-xl text-gray-300">Powered by blockchain technology</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 sm:gap-7"> {/* Slightly reduced gap */}
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 mb-4 sm:mb-5" /> {/* Adjusted mb */}
                            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Forgery Prevention</h3>
                            <p className="text-sm sm:text-base text-gray-300">Immutable blockchain records ensure prescriptions cannot be altered or counterfeited.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 mb-4 sm:mb-5" /> {/* Adjusted mb */}
                            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Privacy Protected</h3>
                            <p className="text-sm sm:text-base text-gray-300">End-to-end encryption keeps sensitive medical data private and secure.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400 mb-4 sm:mb-5" /> {/* Adjusted mb */}
                            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Instant Verification</h3>
                            <p className="text-sm sm:text-base text-gray-300">Real-time prescription validation through smart contracts and QR codes.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Timeline */}
            {/* Reduced py */}
            <section id="how-it-works" className="relative z-10 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10 sm:mb-14"> {/* Adjusted mb */}
                        <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">How DPVS Works</h2>
                        <p className="text-lg sm:text-xl text-gray-300">Simple, secure, and transparent process</p>
                    </div>

                    <div className="relative">
                        <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-500 rounded-full"></div>

                        <div className="space-y-10 sm:space-y-12"> {/* Reduced space-y */}
                            {/* Step 1 */}
                            <div className="flex items-center">
                                <div className="flex-1 text-right pr-4 sm:pr-8">
                                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Doctor Issues Prescription</h3>
                                    <p className="text-sm sm:text-base text-gray-300">Licensed doctors create secure digital prescriptions with patient details and medication information.</p>
                                </div>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center relative z-10">
                                    <Stethoscope className="w-7 h-7 sm:w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1 pl-4 sm:pl-8"></div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-center">
                                <div className="flex-1"></div>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center relative z-10">
                                    <Database className="w-7 h-7 sm:w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1 text-left pl-4 sm:pl-8">
                                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Blockchain Storage</h3>
                                    <p className="text-sm sm:text-base text-gray-300">Prescription data is encrypted and stored immutably on the blockchain network.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex items-center">
                                <div className="flex-1 text-right pr-4 sm:pr-8">
                                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Patient Access</h3>
                                    <p className="text-sm sm:text-base text-gray-300">Patients receive secure access to their prescriptions and can share QR codes with pharmacies.</p>
                                </div>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center relative z-10">
                                    <User className="w-7 h-7 sm:w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1"></div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex items-center">
                                <div className="flex-1"></div>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center relative z-10">
                                    <Pill className="w-7 h-7 sm:w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1 text-left pl-4 sm:pl-8">
                                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Pharmacy Verification</h3>
                                    <p className="text-sm sm:text-base text-gray-300">Pharmacists scan QR codes to instantly verify prescription authenticity and fulfill orders.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Stats Section */}
            {/* Reduced py */}
            <section className="relative z-10 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-6 sm:gap-7"> {/* Slightly reduced gap */}
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <div className="text-3xl sm:text-4xl font-bold text-cyan-400 mb-2">100%</div>
                            <div className="text-sm sm:text-base text-gray-300">Fraud Prevention</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-2">24/7</div>
                            <div className="text-sm sm:text-base text-gray-300">System Availability</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <div className="text-3xl sm:text-4xl font-bold text-green-400 mb-2">Zero</div>
                            <div className="text-sm sm:text-base text-gray-300">Data Breaches</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10">
                            <div className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-2">Instant</div>
                            <div className="text-sm sm:text-base text-gray-300">Verification</div>
                        </div>
                    </div>
                </div>
            </section>
            {/* MetaMask Setup Section */}
            {/* Reduced py */}
            <section id="metamask-setup" className="relative z-10 py-12 sm:py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 sm:p-7 border border-white/10 hover:border-blue-500/50 transition-colors duration-300">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            <Network className="w-8 h-8 sm:w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Connect to Polygon Amoy Testnet</h2>
                        <p className="text-sm sm:text-lg text-gray-300 mb-6 max-w-2xl mx-auto"> {/* Adjusted mb */}
                            To interact with DPVS, ensure your MetaMask wallet is configured correctly.
                            For amoy faucets join Polygon discord & ask for free faucets
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 sm:gap-7 text-left mx-auto max-w-3xl"> {/* Slightly reduced gap */}
                            {/* Network Details Card */}
                            <div className="bg-white/5 p-5 rounded-lg border border-white/10 hover:border-cyan-400 transition-colors duration-300 flex flex-col justify-between">
                                <div>
                                    <p className="text-base font-semibold text-cyan-300 mb-3 flex items-center">
                                        <span className="mr-2 text-xl" role="img" aria-label="chain link">🔗</span> Network Details:
                                    </p>
                                    <ul className="text-sm text-gray-300 space-y-2">
                                        <li><span className="font-medium text-white">Network Name:</span> <code className="block bg-white/10 px-2 py-1 rounded text-xs mt-1 select-all break-words sm:inline-block">Polygon Amoy</code></li>
                                        <li><span className="font-medium text-white">New RPC URL:</span> <code className="block bg-white/10 px-2 py-1 rounded text-xs mt-1 select-all break-words sm:inline-block">rpc-amoy.polygon.technology</code></li>
                                        <li><span className="font-medium text-white">Chain ID:</span> <code className="block bg-white/10 px-2 py-1 rounded text-xs mt-1 select-all break-words sm:inline-block">80002</code></li>
                                    </ul>
                                </div>
                            </div>

                            {/* Wallet Configuration Card */}
                            <div className="bg-white/5 p-5 rounded-lg border border-white/10 hover:border-purple-400 transition-colors duration-300 flex flex-col justify-between">
                                <div>
                                    <p className="text-base font-semibold text-purple-300 mb-3 flex items-center">
                                        <span className="mr-2 text-xl" role="img" aria-label="lightbulb">💡</span> Wallet Configuration:
                                    </p>
                                    <ul className="text-sm text-gray-300 space-y-2">
                                        <li><span className="font-medium text-white">Currency Symbol:</span> <code className="block bg-white/10 px-2 py-1 rounded text-xs mt-1 select-all break-words sm:inline-block">MATIC</code></li>
                                        <li><span className="font-medium text-white">Block Explorer URL:</span> <code className="block bg-white/10 px-2 py-1 rounded text-xs mt-1 select-all break-words sm:inline-block">amoy.polygonscan.com</code></li>
                                        <li><span className="font-medium text-white">Recommended:</span> <span className="text-purple-300 font-medium">Add network directly in MetaMask.</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {!isConnected && (
                            <button
                                onClick={connectWallet}
                                disabled={loading}
                                className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 mt-8 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-base sm:text-lg font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Connecting...' : <><Wallet className="w-5 h-5 sm:w-6 h-6 mr-1 sm:mr-2" /> Connect Wallet Now</>}
                                <ArrowRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </section>


            {/* Footer */}
            {/* Reduced py and adjusted inner margins */}
            <footer className="relative z-10 bg-white/5 backdrop-blur-lg border-t border-white/10 py-6 sm:py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Using flex for responsiveness on footer content */}
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2 sm:mb-3 md:mb-0"> {/* Adjusted mb */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                    <FileText  className="w-5 h-5 sm:w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">DPVS</h3> {/* Adjusted mb */}
                    <p className="text-sm sm:text-base text-gray-300">Decentralized Prescription Verification System</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">Open Source Healthcare for All</p> {/* Adjusted mt */}
                </div>
            </div>

            {/* Platform and Community links - always side by side, even on mobile */}
            <div className="flex space-x-6 sm:space-x-8 mt-4 md:mt-0">
                <div className="text-left">
                    <h4 className="font-semibold mb-2 sm:mb-3 text-base sm:text-lg">Platform</h4> {/* Adjusted mb */}
                    <ul className="space-y-1 sm:space-y-1.5 text-gray-300 text-sm sm:text-base"> {/* Reduced space-y */}
                        <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                        <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                    </ul>
                </div>

                <div className="text-left">
                    <h4 className="font-semibold mb-2 sm:mb-3 text-base sm:text-lg">Community</h4> {/* Adjusted mb */}
                    <ul className="space-y-1 sm:space-y-1.5 text-gray-300 text-sm sm:text-base"> {/* Reduced space-y */}
                        <li><a href="https://github.com/Sourjya-Saha" className="hover:text-white transition-colors">GitHub</a></li>
                        <li><a href="https://www.linkedin.com/in/sourjya-saha-106b42317" className="hover:text-white transition-colors">LinkedIn</a></li>
                        <li><a href="https://x.com/SahaSourjya" className="hover:text-white transition-colors">Twitter</a></li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Copyright and Social Icons at the bottom of the footer */}
        {/* Reduced mt and pt */}
        <div className="border-t border-white/10 mt-5 pt-5 sm:mt-6 sm:pt-6 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3 md:mb-0"> {/* Adjusted mb */}
                © 2025 DPVS by Sourjya. Securing healthcare through blockchain technology.
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4"> {/* Reduced space-x */}
                <a href="https://github.com/Sourjya-Saha" className="text-gray-300 hover:text-white transition-colors">
                    <Github className="w-4 h-4 sm:w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/in/sourjya-saha-106b42317" className="text-gray-300 hover:text-white transition-colors">
                    <Linkedin className="w-4 h-4 sm:w-5 h-5" />
                </a>
            </div>
        </div>
    </div>
</footer>

        </div>
    );
}

export default App;
