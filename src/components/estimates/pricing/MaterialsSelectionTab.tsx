interface MaterialsSelectionTabProps {
  selectedPackage: string;
  onMaterialsChange: (materials: any) => void;
  initialMaterials?: any;
}

const MaterialsSelectionTab = ({ 
  selectedPackage, 
  onMaterialsChange, 
  initialMaterials 
}: MaterialsSelectionTabProps) => {
  
  const getDefaultMaterials = () => {
    if (selectedPackage === 'gaf-1') {
      return {
        shingles: 'GAF Timberline HDZ',
        starter: 'GAF ProStart Starter Shingle Strip (120\')',
        ridge: 'GAF Seal-A-Ridge (25\')',
        iceAndWater: 'GAF WeatherWatch Ice & Water Shield',
        underlayment: 'ABC Pro Guard 20 (Rhino)',
        drip: 'White Aluminum Drip Edge',
        vents: 'Lomanco 750 Roof Vents'
      };
    } else if (selectedPackage === 'gaf-2') {
      return {
        shingles: 'GAF Timberline HDZ',
        starter: 'GAF ProStart Starter Shingle Strip (120\')',
        ridge: 'GAF Seal-A-Ridge (25\')',
        iceAndWater: 'GAF WeatherWatch Ice & Water Shield (valleys only)',
        underlayment: 'GAF FeltBuster Synthetic Underlayment (10 sq)',
        drip: 'White Aluminum Drip Edge',
        vents: 'Lomanco 750 Roof Vents'
      };
    }
    return {
      shingles: '',
      starter: '',
      ridge: '',
      iceAndWater: '',
      underlayment: '',
      drip: '',
      vents: ''
    };
  };

  // Continue with the rest of the component...
}; 