import { createContext, useContext, useState } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
    // Legal Analyzer State
    const [legalState, setLegalState] = useState({
        files: [],
        analysis: null,
        riskFilter: 'ALL',
        step: 0,
        isChatExpanded: false,
        chatMessages: [{ role: 'assistant', content: "Hello! I've analyzed your document. You can ask me questions about specific clauses, liability, or termination terms.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
    })

    // Research Synth State
    const [researchState, setResearchState] = useState({
        files: [],
        topic: '',
        result: null,
        step: 0,
        isChatExpanded: true,
        chatMessages: [{ role: 'assistant', content: "I've analyzed the papers. How can I help you navigate the synthesis today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
        chatQuestion: '',
    })

    const resetAll = () => {
        setLegalState({
            files: [],
            analysis: null,
            riskFilter: 'ALL',
            step: 0,
            isChatExpanded: false,
            chatMessages: [{ role: 'assistant', content: "Hello! I've analyzed your document. You can ask me questions about specific clauses, liability, or termination terms.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
        })
        setResearchState({
            files: [],
            topic: '',
            result: null,
            step: 0,
            isChatExpanded: true,
            chatMessages: [{ role: 'assistant', content: "I've analyzed the papers. How can I help you navigate the synthesis today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
            chatQuestion: '',
        })
    }

    return (
        <AppContext.Provider value={{ legalState, setLegalState, researchState, setResearchState, resetAll }}>
            {children}
        </AppContext.Provider>
    )
}

export function useAppContext() {
    return useContext(AppContext)
}
