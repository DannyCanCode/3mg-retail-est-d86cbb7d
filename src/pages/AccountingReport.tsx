import React, { useState, useEffect, useMemo } from 'react';
import { getSoldEstimates } from '@/api/estimates'; // Adjust import path
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout'; // Import layout if needed
import { format, subDays, startOfDay, endOfDay } from 'date-fns'; // Import date functions
// import * as XLSX from 'xlsx'; // Comment out: Package uninstalled
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"; // Import Select components
import { Label } from "@/components/ui/label"; // Import Label

// Define an interface for the structure of sold estimate data
interface SoldEstimateReportData {
  id: string;
  customer_name?: string;
  customer_address?: string; // Changed to single field
  sold_at: string | null;
  calculated_material_cost: number | null;
  calculated_labor_cost: number | null;
  calculated_subtotal: number | null;
  profit_margin: number | null; // The percentage
  calculated_profit_amount: number | null; // The dollar amount
  total_price: number | null; // Changed from total_amount
}

const AccountingReport: React.FC = () => {
  const [soldEstimates, setSoldEstimates] = useState<SoldEstimateReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all'); // Default to 'all'

  // Calculate start/end dates based on selection
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    const endDate = endOfDay(now); // End date is always end of today for ranges

    switch (selectedPeriod) {
      case '30d':
        startDate = startOfDay(subDays(now, 30));
        break;
      case '60d':
        startDate = startOfDay(subDays(now, 60));
        break;
      case '90d':
        startDate = startOfDay(subDays(now, 90));
        break;
      case 'all':
      default:
        startDate = null; // No start date for 'all'
        break;
    }
    
    return {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate.toISOString() // Always use today as end date for filtering
    };
  }, [selectedPeriod]);

  // Fetch data when dateRange changes
  useEffect(() => {
    const fetchEstimates = async () => {
      let fetchedData: SoldEstimateReportData[] = []; // Variable to hold data
      try {
        setIsLoading(true);
        setError(null);
        console.log(`[AccountingReport] Fetching estimates for period: ${selectedPeriod}`, dateRange);
        
        // Call API - it returns the array directly or throws an error
        fetchedData = await getSoldEstimates({ 
            startDate: dateRange.startDate, 
            endDate: dateRange.startDate ? dateRange.endDate : undefined 
        }); 

        console.log("[AccountingReport] Received data from getSoldEstimates:", fetchedData);
        setSoldEstimates(fetchedData || []); // Set state with fetched data

      } catch (err: any) { // Catch any error thrown by getSoldEstimates
        console.error("[AccountingReport] Error fetching sold estimates:", err);
        setError(`Failed to load report data: ${err.message}`);
        setSoldEstimates([]); // Clear estimates on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchEstimates();
  }, [dateRange]); // Re-run effect when dateRange changes

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MM/dd/yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  // --- Comment out handleExport function --- 
  /*
  const handleExport = () => {
     // Prepare data for export
     const exportData = soldEstimates.map(est => ({
       'Estimate ID': est.id,
       'Customer': est.customer_name || 'N/A', 
       'Address': est.customer_address || '', // Use the single address field
       'Sold Date': formatDate(est.sold_at),
       'Material Cost': est.calculated_material_cost ?? 0, // Provide default for sheetjs
       'Labor Cost': est.calculated_labor_cost ?? 0,
       'Subtotal': est.calculated_subtotal ?? 0,
       'Profit Margin (%)': est.profit_margin ?? 0,
       'Profit Amount ($': est.calculated_profit_amount ?? 0,
       'Total Amount': est.total_price ?? 0, // Use total_price
     }));

     const worksheet = XLSX.utils.json_to_sheet(exportData);

     // Optional: Set column widths (example)
     worksheet['!cols'] = [
        { wch: 15 }, // Estimate ID
        { wch: 25 }, // Customer
        { wch: 40 }, // Address
        { wch: 12 }, // Sold Date
        { wch: 15 }, // Material Cost
        { wch: 15 }, // Labor Cost
        { wch: 15 }, // Subtotal
        { wch: 18 }, // Profit Margin (%)
        { wch: 18 }, // Profit Amount ($
        { wch: 18 }, // Total Amount
     ];

     // Format currency columns (example - requires SheetJS Pro or careful formatting)
     // This basic example just writes numbers, Excel usually auto-detects
     // For explicit formatting, you might need to set cell types (`t:'n'`, `z:'$#,##0.00'`)

     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, 'Sold Estimates');
     XLSX.writeFile(workbook, `Sold_Estimates_Report_${selectedPeriod}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };
  */
  // --- End Comment out --- 

  return (
    <MainLayout> { /* Wrap content in MainLayout if needed */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
         <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
               <CardTitle>Accounting Report - Sold Estimates</CardTitle>
               <div className="flex items-center gap-4">
                 {/* --- Date Range Selector --- */} 
                 <div className="flex items-center gap-2">
                    <Label htmlFor="date-period">Period:</Label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger id="date-period" className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="60d">Last 60 Days</SelectItem>
                        <SelectItem value="90d">Last 90 Days</SelectItem>
                        {/* Add Custom Range later if needed */}
                      </SelectContent>
                    </Select>
                 </div>
                 {/* --- End Date Range Selector --- */} 
                 <Button 
                    /* onClick={handleExport} // Comment out handler */ 
                    disabled={true} /* Disable button */
                    title="Export functionality temporarily disabled" /* Add tooltip */
                 >
                    Export to Excel
                 </Button>
               </div>
            </CardHeader>
            <CardContent>
               {isLoading && <p>Loading report data...</p>}
               {error && <p className="text-red-600">{error}</p>}
               {!isLoading && !error && (
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Estimate ID</TableHead>
                           <TableHead>Customer / Address</TableHead>
                           <TableHead>Sold Date</TableHead>
                           <TableHead className="text-right">Material Cost</TableHead>
                           <TableHead className="text-right">Labor Cost</TableHead>
                           <TableHead className="text-right">Subtotal</TableHead>
                           <TableHead className="text-right">Margin (%)</TableHead>
                           <TableHead className="text-right">Profit ($)</TableHead>
                           <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {soldEstimates.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={9} className="text-center">No sold estimates found{selectedPeriod !== 'all' ? ' for the selected period' : ''}.</TableCell>
                           </TableRow>
                        ) : (
                           soldEstimates.map((est) => (
                              <TableRow key={est.id}>
                                 <TableCell className="font-medium">{est.id.substring(0, 8)}...</TableCell>
                                 <TableCell>
                                   <div>{est.customer_name || 'N/A'}</div>
                                   <div className="text-xs text-muted-foreground">
                                      {est.customer_address || ''}
                                   </div>
                                 </TableCell>
                                 <TableCell>{formatDate(est.sold_at)}</TableCell>
                                 <TableCell className="text-right">{formatCurrency(est.calculated_material_cost)}</TableCell>
                                 <TableCell className="text-right">{formatCurrency(est.calculated_labor_cost)}</TableCell>
                                 <TableCell className="text-right">{formatCurrency(est.calculated_subtotal)}</TableCell>
                                 <TableCell className="text-right">{est.profit_margin !== null ? `${est.profit_margin}%` : 'N/A'}</TableCell>
                                 <TableCell className="text-right">{formatCurrency(est.calculated_profit_amount)}</TableCell>
                                 <TableCell className="text-right font-semibold">{formatCurrency(est.total_price)}</TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>
      </div>
    </MainLayout>
  );
};

export default AccountingReport; 