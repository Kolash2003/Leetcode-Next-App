"use client"
import { useParams } from "next/navigation"
import { useProblem } from "@/modules/hooks/use-problem"
import { Spinner } from "@/components/ui/spinner"
import { ProblemHeader } from "@/modules/problems/components/problem-header"
import { ProblemDescription } from "@/modules/problems/components/problem-description"
import { ProbloemTabs } from "@/modules/problems/components/problem-tabs";
import CodeEditorPanel from "@/modules/problems/components/code-editor-panel";
import { useEditor } from "@/modules/hooks/use-editor"
import TestCasesPanel from "@/modules/problems/components/test-cases-panel"

const ProblemPage = () => {
    const params = useParams<{ id: string }>()

    const { problem, isLoading } = useProblem(params.id);
    const {
        selectedLanguage,
        setSelectedLanguage,
        code,
        setCode,
        handleRun,
        handleSubmit,
        isRunning,
        isSubmitting,
        executionResponse,
    } = useEditor(problem);
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="msx-w-7xl mx-auto">
                <ProblemHeader problem={problem} />
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* LEFT Panel */}
                    <div className="space-y-6">
                        <ProblemDescription problem={problem} selectedLanguage={"JAVASCRIPT"} />
                        <ProbloemTabs problem={problem} />
                    </div>
                    {/* RIGHT panel */}
                    <div className="space-y-6">
                        <CodeEditorPanel
                            code={code}
                            onCodeChange={setCode}
                            selectedLanguage={selectedLanguage}
                            onLanguageChange={setSelectedLanguage}
                            onRun={handleRun}
                            onSubmit={handleSubmit}
                            isRunning={isRunning}
                            isSubmitting={isSubmitting}
                        />

                        <TestCasesPanel testCases={problem.testCases} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProblemPage