interface WarrantySelectorProps {
  selectedPackage: string;
  selectedWarranty: string;
  onWarrantySelect: (warrantyId: string) => void;
}

const WarrantySelector = ({ 
  selectedPackage, 
  selectedWarranty, 
  onWarrantySelect 
}: WarrantySelectorProps) => {
  
  // Check if Gold Pledge is available based on selected package
  const isGoldPledgeAvailable = selectedPackage === 'gaf-2';
  
  return (
    <div className="bg-white p-4 rounded-md shadow-sm mt-4">
      <h3 className="text-lg font-medium mb-3">GAF Warranty Options</h3>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div 
          className={`border p-3 rounded-md cursor-pointer ${selectedWarranty === 'silver-pledge' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => onWarrantySelect('silver-pledge')}
        >
          <h4 className="font-medium">Silver Pledge Warranty</h4>
          <p className="text-sm text-gray-600 mt-1">Standard GAF warranty coverage</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>10-year workmanship coverage</li>
            <li>Lifetime material warranty</li>
            <li>Available with GAF 1 or GAF 2 Package</li>
          </ul>
          <p className="text-sm font-medium mt-2">Basic protection for your roof</p>
        </div>
        
        <div 
          className={`border p-3 rounded-md ${!isGoldPledgeAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${selectedWarranty === 'gold-pledge' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => isGoldPledgeAvailable && onWarrantySelect('gold-pledge')}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Gold Pledge Warranty</h4>
            {!isGoldPledgeAvailable && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Requires GAF 2 Package
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">Premium GAF warranty with enhanced coverage</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>25-year workmanship coverage</li>
            <li>Lifetime material warranty</li>
            <li>Requires GAF Cobra Ventilation</li>
            <li>Requires GAF 2 Package</li>
          </ul>
          <p className="text-sm font-medium mt-2 text-green-600">Superior protection for your investment</p>
        </div>
      </div>
      
      {selectedWarranty === 'gold-pledge' && !isGoldPledgeAvailable && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          Gold Pledge Warranty requires the GAF 2 Package selection, which includes GAF Cobra ventilation.
          Please select GAF 2 Package to enable this warranty option.
        </div>
      )}
    </div>
  );
};

export default WarrantySelector; 