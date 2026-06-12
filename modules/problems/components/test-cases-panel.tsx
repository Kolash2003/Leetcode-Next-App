import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

interface TestCase {
    input: string;
    output: string;
}

interface TestCasesPanelProps {
    testCases: TestCase[];
}

const TestCasesPanel = ({ testCases }: TestCasesPanelProps) => {
    if (!testCases || testCases.length === 0) {
        return null;
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Cases</CardTitle>
                <CardDescription>Run your code against these test cases</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48">
                    <div className="space-y-4">
                        {testCases.map((testCase, index) => (
                            <TestCaseItem key={index} testCase={testCase} index={index} />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

interface TestCaseItemProps {
    testCase: TestCase;
    index: number;
}

function TestCaseItem({ testCase, index }: TestCaseItemProps) {
    return (
        <div className="border rounded-lg p-3">
            <div className="text-sm font-medium mb-2">Test Case {index + 1}</div>
            <div className="space-y-1 text-sm">
                <div>
                    <span className="text-muted-foreground">Input: </span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{testCase.input}</code>
                </div>
                <div>
                    <span className="text-muted-foreground">Expected: </span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{testCase.output}</code>
                </div>
            </div>
        </div>
    )
}

export default TestCasesPanel