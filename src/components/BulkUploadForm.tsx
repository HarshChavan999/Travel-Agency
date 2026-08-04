import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDbInstance } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, FileDown, Upload, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';

// Custom inline Alert components
const Alert = ({ children, className, variant }: any) => (
  <div className={`p-4 rounded-2xl border flex gap-3 ${variant === 'destructive' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-blue-50 text-blue-900 border-blue-200'} ${className}`}>
    {children}
  </div>
);

const AlertTitle = ({ children, className }: any) => (
  <h5 className={`font-bold leading-none tracking-tight mb-1 text-sm ${className}`}>{children}</h5>
);

const AlertDescription = ({ children, className }: any) => (
  <div className={`text-xs opacity-90 ${className}`}>{children}</div>
);

// Custom inline Progress component
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 overflow-hidden ${className}`}>
    <div 
      className="bg-orange-400 h-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

interface BulkUploadFormProps {
  agencyId: string;
  onSuccess: () => void;
}

interface ParsedListing {
  rowNum: number;
  data: {
    packageType: 'domestic' | 'international';
    countryName: string;
    stateName: string;
    pickUpLocation?: string;
    dropLocation?: string;
    cost: string;
    tourCategories: string[];
    hotelTypes: string[];
    mealPlan: 'no-meal' | 'breakfast' | 'breakfast-dinner' | 'all-meals';
    placesCovered: Array<{ id: string; name: string; images: File[]; imageUrls: string[] }>;
    itinerary: Array<{ id: string; day: number; placeName: string; description: string }>;
    inclusions: string;
    exclusions: string;
    experienceType?: string;
    season?: string;
    eventType?: string;
    countryNames?: string[];
    stateNames?: string[];
  };
  errors: string[];
  isValid: boolean;
}

const VALID_TOUR_CATEGORIES = ['Family', 'Honeymoon', 'Friends', 'Religious', 'Fix Departure'];
const VALID_HOTEL_TYPES = ['budget', 'deluxe', 'premium'];
const VALID_MEAL_PLANS = ['no-meal', 'breakfast', 'lunch', 'dinner', 'breakfast-lunch', 'breakfast-dinner', 'lunch-dinner', 'all-meals'];

export default function BulkUploadForm({ agencyId, onSuccess }: BulkUploadFormProps) {
  const [parsedListings, setParsedListings] = useState<ParsedListing[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ success: 0, failed: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Generate and download sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = [
      ['packageType', 'countryName', 'stateName', 'pickUpLocation', 'dropLocation', 'cost', 'tourCategories', 'hotelTypes', 'mealPlan', 'placesCovered', 'imageUrls', 'itinerary', 'inclusions', 'exclusions', 'experienceType', 'season', 'eventType'],
      ['domestic', '', 'Goa', 'Delhi Airport', 'Goa Airport', '15000', 'Family, Friends', 'budget, deluxe', 'breakfast-dinner', 'Panaji, Calangute Beach, Dudhsagar Falls', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'Panaji @ Day 1: Arrival & transfer to hotel. Spend evening at leisure.||Calangute Beach @ Day 2: North Goa sightseeing tour.||Dudhsagar Falls @ Day 3: South Goa sightseeing tour & spice plantation.||Panaji @ Day 4: Departure transfer to airport.', '3 Nights hotel accommodation;Daily breakfast and dinner;North & South Goa sightseeing transfers', 'Airfare/Train tickets;Lunch;Personal expenses;Monument entry fees', 'adventure', 'summer', 'weekend'],
      ['international', 'Thailand', '', 'Mumbai Airport', 'Bangkok Airport', '35000', 'Honeymoon, Friends', 'deluxe, premium', 'breakfast', 'Bangkok, Pattaya, Coral Island', 'https://images.unsplash.com/photo-1528127269322-539801943592, https://images.unsplash.com/photo-1552465011-b4e21bf6e79a', 'Pattaya @ Day 1: Arrival in Bangkok & transfer to Pattaya hotel.||Coral Island @ Day 2: Coral Island speedboat tour with lunch.||Bangkok @ Day 3: Transfer back to Bangkok. Afternoon city temple tour.||Bangkok @ Day 4: Departure transfer to Bangkok Airport.', '3 Nights hotel stay;Daily breakfast;Coral Island tour with lunch;Airport & hotel transfers', 'Flights;Thailand visa fees;Dinner;Personal expenses', 'adventure', 'winter', 'new-year']
    ];

    const csvString = Papa.unparse(csvContent);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'travel_listings_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process and validate CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setErrorMessage(null);
    setParsedListings([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        const data = results.data as any[];

        if (data.length === 0) {
          setErrorMessage('The uploaded CSV file is empty.');
          return;
        }

        const listings: ParsedListing[] = data.map((row, index) => {
          const rowNum = index + 2; // Row number in sheet (1-based + 1 for header)
          const errors: string[] = [];

          // 1. Validate packageType
          const packageTypeStr = (row.packageType || '').trim().toLowerCase();
          const packageType = packageTypeStr === 'international' ? 'international' : 'domestic';
          if (packageTypeStr !== 'domestic' && packageTypeStr !== 'international') {
            errors.push(`Invalid packageType: must be "domestic" or "international". Defaulted to "domestic".`);
          }

          // 2. Validate countryName and stateName based on packageType
          const countryName = (row.countryName || '').trim();
          const stateName = (row.stateName || '').trim();
          if (packageType === 'international' && !countryName) {
            errors.push('Country Name is required for International packages.');
          }
          if (packageType === 'domestic' && !stateName) {
            errors.push('State Name is required for Domestic packages.');
          }

          const pickUpLocation = (row.pickUpLocation || '').trim();
          const dropLocation = (row.dropLocation || '').trim();

          // 3. Validate cost
          const costStr = (row.cost || '').trim();
          if (!costStr) {
            errors.push('Starting Price (cost) is required.');
          } else if (isNaN(Number(costStr)) || Number(costStr) <= 0) {
            errors.push(`Invalid Price (cost): "${costStr}" must be a number greater than 0.`);
          }

          // 4. Validate tourCategories
          const tourCategories = (row.tourCategories || '')
            .split(',')
            .map((cat: string) => cat.trim())
            .filter((cat: string) => cat.length > 0)
            .map((cat: string) => {
              // Match casing to expected categories
              const matched = VALID_TOUR_CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase());
              if (!matched) {
                errors.push(`Warning: Category "${cat}" is not standard. Allowed: ${VALID_TOUR_CATEGORIES.join(', ')}.`);
                return cat;
              }
              return matched;
            });

          if (tourCategories.length === 0) {
            errors.push('At least one Tour Category is required (e.g., Family, Honeymoon).');
          }

          // 5. Validate hotelTypes
          const hotelTypes = (row.hotelTypes || '')
            .split(',')
            .map((type: string) => type.trim().toLowerCase())
            .filter((type: string) => type.length > 0)
            .filter((type: string) => {
              const isValid = VALID_HOTEL_TYPES.includes(type);
              if (!isValid) {
                errors.push(`Invalid hotelType: "${type}". Allowed: budget, deluxe, premium.`);
              }
              return isValid;
            });

          if (hotelTypes.length === 0) {
            errors.push('At least one Hotel Type is required (e.g., budget, deluxe).');
          }

          // 6. Validate mealPlan
          const mealPlan = (row.mealPlan || '').trim().toLowerCase() as any;
          if (!VALID_MEAL_PLANS.includes(mealPlan)) {
            errors.push(`Invalid mealPlan: "${row.mealPlan}". Allowed: no-meal, breakfast, lunch, dinner, breakfast-lunch, breakfast-dinner, lunch-dinner, all-meals. Defaulted to "no-meal".`);
          }

          // 7. Parse image URLs
          const imageUrls = (row.imageUrls || '')
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0);

          // 8. Parse placesCovered and assign image URLs to the first place
          const placesStr = (row.placesCovered || '').trim();
          let placesCovered: any[] = [];
          if (!placesStr) {
            errors.push('Places Covered is required.');
          } else {
            placesCovered = placesStr.split(',').map((name: string, i: number) => ({
              id: `${Date.now()}_place_${index}_${i}`,
              name: name.trim(),
              images: [],
              imageUrls: i === 0 ? imageUrls : [] // Attach all image URLs to first place as primary photos
            })).filter((p: any) => p.name.length > 0);
          }

          // 9. Parse itinerary days (separated by ||)
          const itineraryStr = (row.itinerary || '').trim();
          let itinerary: any[] = [];
          if (!itineraryStr) {
            errors.push('Itinerary is required.');
          } else {
            itinerary = itineraryStr.split('||').map((dayText: string, i: number) => {
              const parts = dayText.split('@');
              let placeName = '';
              let description = dayText.trim();
              
              if (parts.length > 1) {
                placeName = parts[0].trim();
                description = parts.slice(1).join('@').trim();
              }
              
              return {
                id: `${Date.now()}_day_${index}_${i}`,
                day: i + 1,
                placeName,
                description
              };
            }).filter((d: any) => d.description.length > 0);
          }

          // 10. Format inclusions & exclusions (convert semicolons to newlines/lists)
          const inclusions = (row.inclusions || '').trim().replace(/;/g, '\n');
          const exclusions = (row.exclusions || '').trim().replace(/;/g, '\n');

          // 11. Parse classification fields
          const experienceType = (row.experienceType || '').trim().toLowerCase();
          const season = (row.season || '').trim().toLowerCase();
          const eventType = (row.eventType || '').trim().toLowerCase();

          return {
            rowNum,
            data: {
              packageType,
              countryName,
              stateName,
              countryNames: packageType === 'international' ? countryName.split(',').map((c: string) => c.trim()).filter(Boolean) : [],
              stateNames: packageType === 'domestic' ? stateName.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
              pickUpLocation,
              dropLocation,
              cost: costStr,
              tourCategories,
              hotelTypes,
              mealPlan: VALID_MEAL_PLANS.includes(mealPlan) ? mealPlan : 'no-meal',
              placesCovered,
              itinerary,
              inclusions,
              exclusions,
              experienceType,
              season,
              eventType
            },
            errors,
            isValid: errors.filter(err => !err.startsWith('Warning:')).length === 0
          };
        });

        setParsedListings(listings);
      },
      error: (err) => {
        setIsParsing(false);
        setErrorMessage(`CSV parsing error: ${err.message}`);
      }
    });
  };

  // Perform Firestore Bulk Upload
  const handleBulkUpload = async () => {
    const validListings = parsedListings.filter(l => l.isValid);
    if (validListings.length === 0) {
      alert('No valid packages to upload. Please fix errors first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStats({ success: 0, failed: 0, total: validListings.length });

    const dbInstance = getDbInstance();
    if (!dbInstance) {
      setErrorMessage('Database instance is not initialized.');
      setIsUploading(false);
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validListings.length; i++) {
      const listing = validListings[i];
      
      // Determine main photo for backward compatibility
      const mainPhoto = listing.data.placesCovered[0]?.imageUrls[0] || '';

      const listingData = {
        packageType: listing.data.packageType,
        countryName: listing.data.countryName,
        stateName: listing.data.stateName,
        countryNames: listing.data.countryNames || [],
        stateNames: listing.data.stateNames || [],
        pickUpLocation: listing.data.pickUpLocation || '',
        dropLocation: listing.data.dropLocation || '',
        placesCovered: listing.data.placesCovered,
        tourCategories: listing.data.tourCategories,
        hotelTypes: listing.data.hotelTypes,
        mealPlan: listing.data.mealPlan,
        itinerary: listing.data.itinerary,
        inclusions: listing.data.inclusions,
        exclusions: listing.data.exclusions,
        cost: listing.data.cost,
        photos: mainPhoto ? [mainPhoto] : [],
        experienceType: listing.data.experienceType || '',
        season: listing.data.season || '',
        eventType: listing.data.eventType || '',
        agencyId,
        approved: false, // Subject to admin approval
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        await addDoc(collection(dbInstance, 'listings'), listingData);
        successCount++;
      } catch (error) {
        console.error(`Error uploading row ${listing.rowNum}:`, error);
        failedCount++;
      }

      const progress = Math.round(((i + 1) / validListings.length) * 100);
      setUploadProgress(progress);
      setUploadStats({ success: successCount, failed: failedCount, total: validListings.length });
    }

    setIsUploading(false);
    
    if (failedCount === 0) {
      alert(`Successfully imported all ${successCount} listings for approval!`);
      // Reset state and call parent success
      setParsedListings([]);
      setFileName('');
      onSuccess();
    } else {
      alert(`Import complete with errors. Success: ${successCount}, Failed: ${failedCount}.`);
    }
  };

  const totalErrors = parsedListings.reduce((acc, curr) => acc + curr.errors.length, 0);
  const validCount = parsedListings.filter(l => l.isValid).length;

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/30 border-b border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="h-7 w-7 text-blue-600" />
                Bulk Import Packages
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm mt-1">
                Upload hundreds of travel listings in seconds from a Google Sheet (CSV format)
              </CardDescription>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold rounded-2xl py-5 px-4 shadow-sm transition-all"
            >
              <FileDown className="h-4 w-4" />
              Download CSV Template
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="rounded-2xl border-red-200 bg-red-50 text-red-900">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="font-bold">Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-3xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50/50 flex flex-col items-center justify-center gap-4 relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isParsing || isUploading}
            />
            
            <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100">
              {isParsing ? (
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-blue-600" />
              )}
            </div>
            
            <div>
              <p className="font-bold text-gray-800 text-base">
                {fileName ? fileName : 'Choose a CSV file or drag it here'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Only CSV files exported from Excel or Google Sheets are accepted
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3 bg-blue-50/50 border border-blue-100 rounded-3xl p-5">
              <div className="flex justify-between items-center text-sm font-bold text-blue-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading packages to database...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2.5 bg-blue-100 rounded-full" />
              <div className="flex justify-between text-xs text-blue-700 font-semibold mt-1">
                <span>Total Items: {uploadStats.total}</span>
                <span>Success: {uploadStats.success}</span>
                <span>Failed: {uploadStats.failed}</span>
              </div>
            </div>
          )}

          {/* Summary stats after parsing */}
          {parsedListings.length > 0 && !isUploading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col">
                <span className="text-xs font-semibold text-gray-500">Total Packages Found</span>
                <span className="text-2xl font-extrabold text-gray-950 mt-1">{parsedListings.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-green-50 border border-green-100 flex flex-col">
                <span className="text-xs font-semibold text-green-600">Valid & Ready to Import</span>
                <span className="text-2xl font-extrabold text-green-700 mt-1">{validCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-100 flex flex-col">
                <span className="text-xs font-semibold text-yellow-600">Errors & Warnings Found</span>
                <span className="text-2xl font-extrabold text-yellow-700 mt-1">{totalErrors}</span>
              </div>
            </div>
          )}

          {/* Listing Rows Preview */}
          {parsedListings.length > 0 && !isUploading && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-gray-800 text-lg">Packages Preview</h3>
                {validCount > 0 && (
                  <Button
                    type="button"
                    onClick={handleBulkUpload}
                    className="bg-orange-400 hover:bg-orange-500 text-white font-extrabold px-6 py-5 rounded-2xl shadow-md transition-all flex items-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Upload {validCount} Valid Packages
                  </Button>
                )}
              </div>

              <div className="border border-gray-200 rounded-3xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-bold text-gray-500 border-b border-gray-200">
                        <th className="p-4 w-12 text-center">Row</th>
                        <th className="p-4">Package Destination</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Price (INR)</th>
                        <th className="p-4">Days</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {parsedListings.map((listing) => {
                        const destinationName = listing.data.packageType === 'international'
                          ? listing.data.countryName
                          : listing.data.stateName;

                        return (
                          <React.Fragment key={listing.rowNum}>
                            <tr className={`hover:bg-gray-50/50 ${!listing.isValid ? 'bg-red-50/20' : ''}`}>
                              <td className="p-4 text-center font-semibold text-gray-500">{listing.rowNum}</td>
                              <td className="p-4 font-bold text-gray-900">{destinationName || <span className="text-red-500">Missing Destination</span>}</td>
                              <td className="p-4 capitalize text-gray-600">{listing.data.packageType}</td>
                              <td className="p-4 font-semibold text-gray-800">₹{listing.data.cost}</td>
                              <td className="p-4 font-medium text-gray-600">{listing.data.itinerary.length} Days</td>
                              <td className="p-4">
                                {listing.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                                    <CheckCircle className="h-3 w-3" /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full">
                                    <AlertTriangle className="h-3 w-3" /> Fix Errors
                                  </span>
                                )}
                              </td>
                            </tr>
                            
                            {/* Validation Errors Sub-Row */}
                            {listing.errors.length > 0 && (
                              <tr className="bg-yellow-50/30 border-b border-gray-100">
                                <td colSpan={6} className="p-3 pl-12 text-xs">
                                  <div className="flex flex-col gap-1 text-yellow-900 font-medium">
                                    {listing.errors.map((error, idx) => (
                                      <div key={idx} className="flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                                        <span>{error}</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
