// src/TestTailwind.jsx
import { useState, useEffect } from 'react';

export default function TestTailwind() {
    const [isVisible, setIsVisible] = useState(true);
    
    useEffect(() => {
        console.log('TestTailwind component mounted');
        
        return () => {
            console.log('TestTailwind component unmounted');
        };
    }, []);
    
    if (!isVisible) {
        return <div>Component hidden</div>;
    }
    
    return (
        <div className="bg-white p-6 rounded shadow-md max-w-sm mx-auto mt-10 text-center border-2 border-blue-500">
            <h1 className="text-2xl font-bold mb-2 text-gray-800">Tailwind CSS Test</h1>
            <p className="text-blue-600 mb-4">
                If you see this blue-bordered box, Tailwind is working!
            </p>
            <button 
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                    console.log('Button clicked');
                    setIsVisible(false);
                    setTimeout(() => setIsVisible(true), 2000);
                }}
            >
                Test Button (Click me)
            </button>
            <p className="text-sm text-gray-500 mt-2">
                Button will hide/show component to test stability
            </p>
        </div>
    );
}