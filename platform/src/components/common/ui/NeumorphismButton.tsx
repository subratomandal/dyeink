import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { prefetchOnIntent } from '@/lib/prefetch';
import './NeumorphismButton.css';
interface NeumorphismButtonProps {
    text?: string;
    to?: string;
    onClick?: () => void;
    onPrefetch?: () => void;
    icon?: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    className?: string; 
    style?: React.CSSProperties;
}
const NeumorphismButton: React.FC<NeumorphismButtonProps> = ({
    text = "Start Writing",
    to,
    onClick,
    onPrefetch,
    icon,
    type = 'button',
    className = '',
    style = {}
}) => {
    const handlePrefetch = () => {
        if (onPrefetch) prefetchOnIntent(onPrefetch);
    };

    const content = (
        <>
            {icon === undefined ? <ArrowRight size={18} /> : icon}
            <span>{text}</span>
        </>
    );
    if (to) {
        return (
            <Link
                to={to}
                className={`neu-btn ${className}`}
                style={style}
                onMouseEnter={handlePrefetch}
                onFocus={handlePrefetch}
                onTouchStart={handlePrefetch}
            >
                {content}
            </Link>
        );
    }
    return (
        <button type={type} onClick={onClick} className={`neu-btn ${className}`} style={style}>
            {content}
        </button>
    );
};
export default NeumorphismButton;
 
