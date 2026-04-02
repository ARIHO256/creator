import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";

interface NotificationContextType {
    showNotification: (message: string, severity?: AlertColor) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
    showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * NotificationProvider
 * --------------------
 * Manages global toasts (Snackbar + Alert) across the app.
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState<AlertColor>("info");

    const showNotification = useCallback((msg: string, sev: AlertColor = "info") => {
        setMessage(msg);
        setSeverity(sev);
        setOpen(true);
    }, []);

    const showSuccess = useCallback((msg: string) => showNotification(msg, "success"), [showNotification]);
    const showError = useCallback((msg: string) => showNotification(msg, "error"), [showNotification]);
    const showWarning = useCallback((msg: string) => showNotification(msg, "warning"), [showNotification]);
    const showInfo = useCallback((msg: string) => showNotification(msg, "info"), [showNotification]);

    const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") return;
        setOpen(false);
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showWarning, showInfo }}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={5000}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={handleClose}
                    severity={severity}
                    variant="filled"
                    sx={{
                        width: "100%",
                        borderRadius: "16px",
                        fontWeight: 600,
                        fontSize: "13px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
                    }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
};
