import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateKeySet, exportKey, importKey } from '../utils/crypto';
import { saveKeys, loadKeys, initDB } from '../utils/storage';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
    const [keys, setKeys] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initialize = async () => {
            try {
                // Check if keys exist in DB
                const storedKeys = await loadKeys();

                if (storedKeys && storedKeys.length === 15) {
                    // Hydrate keys from storage (they are stored as JWK in this simplified flow, 
                    // dependent on how we serialized them. Let's assume we need to re-import if stored as generic objects, 
                    // but IndexedDB can store CryptoKey objects directly in some browsers. 
                    // For safety cross-browser, we usually store JWK. 
                    // Let's refine the storage logic to handle CryptoKeys directly if possible, or support JWK hydration.)

                    // For now, let's assume we just load them. 
                    setKeys(storedKeys);
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error("Failed to load security context:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, []);

    const generateSystemKeys = async () => {
        setIsLoading(true);
        try {
            // Generate native CryptoKeys
            const rawKeyPairs = await generateKeySet(15);

            // Serialize for storage (IndexedDB can clone CryptoKeys in modern browsers, 
            // but let's export to JWK to be safe and portable)
            const serializedKeys = await Promise.all(rawKeyPairs.map(async (kp) => ({
                publicKey: await exportKey(kp.publicKey),
                privateKey: await exportKey(kp.privateKey)
            })));

            await saveKeys(serializedKeys);
            setKeys(serializedKeys);
            setIsInitialized(true);
            return true;
        } catch (error) {
            console.error("Key generation failed:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SecurityContext.Provider value={{ keys, isInitialized, isLoading, generateSystemKeys }}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => useContext(SecurityContext);
