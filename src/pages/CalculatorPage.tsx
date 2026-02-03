import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useCalculator } from '../hooks/useCalculator';
import { CalculatorHeader } from '../components/calculator/CalculatorHeader';
import { MasterSelector } from '../components/calculator/MasterSelector';
import { InputSection } from '../components/calculator/InputSection';
import { ActionButtons } from '../components/calculator/ActionButtons';
import { ResultSection } from '../components/calculator/ResultSection';

export default function CalculatorPage() {
    const {
        grandMasters,
        selectedMasterId,
        targetMembers,
        inputs,
        results,
        isCalculating,
        expandedMasters,
        handleMasterSelect,
        handleInputChange,
        toggleMaster,
        handleCalculate,
        handleReset
    } = useCalculator();

    const pdfRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        const inputElement = document.getElementById('results-summary');
        if (!inputElement) return;

        try {
            const canvas = await html2canvas(inputElement, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const dateStr = new Date().toISOString().split('T')[0];
            pdf.save(`fee_settlement_${dateStr}.pdf`);
        } catch (error) {
            console.error('PDF creation failed', error);
            alert('PDF 다운로드 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20" ref={pdfRef}>
            <CalculatorHeader />

            <div className="space-y-6">
                <MasterSelector
                    grandMasters={grandMasters}
                    selectedMasterId={selectedMasterId}
                    onSelect={handleMasterSelect}
                />

                {selectedMasterId && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <InputSection
                            targetMembers={targetMembers}
                            inputs={inputs}
                            expandedMasters={expandedMasters}
                            onInputChange={handleInputChange}
                            onToggleMaster={toggleMaster}
                        >
                            <ActionButtons
                                onCalculate={handleCalculate}
                                onReset={handleReset}
                                isCalculating={isCalculating}
                            />
                        </InputSection>

                        <ResultSection
                            results={results}
                            targetMembers={targetMembers}
                            onDownloadPDF={handleDownloadPDF}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
