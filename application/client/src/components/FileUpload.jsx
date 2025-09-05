// src/components/FileUpload.jsx
import { useRef, useState, useCallback } from 'react';
import './FileUpload.css'; // Import the CSS file

const VALID_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

export default function FileUpload({
    onUpload,
    accept = ".csv,.xlsx,.xls",
    multiple = false,
    maxSize = 10 * 1024 * 1024, // 10MB default
    className = "",
    children
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // Validate file
    const validateFile = useCallback((file) => {
        setError(null);

        // Check file extension
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!VALID_EXTENSIONS.includes(ext)) {
            setError(`Invalid file type. Accepted formats: ${VALID_EXTENSIONS.join(', ')}`);
            return false;
        }

        // Check file size
        if (file.size > maxSize) {
            setError(`File too large. Maximum size: ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
            return false;
        }

        return true;
    }, [maxSize]);

    // Handle file selection
    const handleFiles = useCallback((files) => {
        const fileList = Array.from(files);

        if (!multiple && fileList.length > 1) {
            setError('Only one file allowed');
            return;
        }

        const validFiles = fileList.filter(validateFile);

        if (validFiles.length > 0) {
            if (multiple) {
                onUpload(validFiles);
            } else {
                onUpload(validFiles[0]);
            }
        }
    }, [multiple, onUpload, validateFile]);

    // Event handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleChange = useCallback((e) => {
        if (e.target.files?.length > 0) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    const handleClick = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    }, [handleClick]);

    return (
        <div className={`file-upload-wrapper ${className}`}>
            <div
                className={`file-upload-zone ${isDragging ? 'dragging' : ''} ${error ? 'error' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-label="Upload file"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                    aria-hidden="true"
                />

                {children || (
                    <div className="file-upload-content">
                        <svg
                            className="file-upload-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="file-upload-text">
                            Drop files here or click to browse
                        </p>
                        <p className="file-upload-hint">
                            {VALID_EXTENSIONS.join(', ')} up to {(maxSize / (1024 * 1024)).toFixed(0)}MB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="file-upload-error" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}