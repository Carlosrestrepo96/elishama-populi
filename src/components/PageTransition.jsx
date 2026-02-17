import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';

/**
 * Page transition wrapper component
 */
const PageTransition = ({ children }) => {
    const location = useLocation();

    const pageVariants = {
        initial: {
            opacity: 0,
            y: 20
        },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: 'easeOut'
            }
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: {
                duration: 0.2,
                ease: 'easeIn'
            }
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;
