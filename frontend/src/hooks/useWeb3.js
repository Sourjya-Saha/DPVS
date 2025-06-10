import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useWeb3 = () => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const account = await signer.getAddress();
                
                setProvider(provider);
                setSigner(signer);
                setAccount(account);
            } catch (error) {
                console.error('Error connecting wallet:', error);
            }
        }
    };

    return { account, provider, signer, connectWallet };
};