import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, Vote, FileText, Menu, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import PageTransition from './PageTransition';

const MainLayout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navigation */}
            <nav className="bg-white shadow-md z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                                <ShieldCheck className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-xl text-gray-800">EliShamaPopuli</span>
                            </Link>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-1">
                            <Link to="/" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                                Inicio
                            </Link>
                            <Link to="/how-it-works" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <HelpCircle className="w-4 h-4" />
                                Cómo Funciona
                            </Link>
                            <Link to="/vote" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                                Votar
                            </Link>
                            <Link to="/audit" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                                Auditoría
                            </Link>
                            <div className="ml-2">
                                <Link
                                    to="/audit"
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg hover:shadow-lg transition-all hover:scale-105 font-semibold text-sm"
                                >
                                    Generar Claves
                                </Link>
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                            >
                                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                Inicio
                            </Link>
                            <Link to="/how-it-works" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                Cómo Funciona
                            </Link>
                            <Link to="/vote" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                Votar
                            </Link>
                            <Link to="/audit" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                Auditoría
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content with Page Transitions */}
            <main className="flex-grow pt-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <PageTransition>
                        <Outlet />
                    </PageTransition>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} EliShamaPopuli. Votación Democrática Segura.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
