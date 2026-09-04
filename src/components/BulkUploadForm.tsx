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
    title: string;
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
      ['title', 'packageType', 'countryName', 'stateName', 'pickUpLocation', 'dropLocation', 'cost', 'tourCategories', 'hotelTypes', 'mealPlan', 'placesCovered', 'imageUrls', 'itinerary', 'inclusions', 'exclusions', 'experienceType', 'season', 'eventType'],
      ['4 Days / 3 Nights Goa Beach Holiday & Sightseeing Tour', 'domestic', '', 'Goa', 'Delhi Airport', 'Goa Airport', '15000', 'Family, Friends', 'budget, deluxe', 'breakfast-dinner', 'Panaji, Calangute Beach, Dudhsagar Falls', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'Panaji @ Day 1: Arrival & transfer to hotel. Spend evening at leisure.||Calangute Beach @ Day 2: North Goa sightseeing tour.||Dudhsagar Falls @ Day 3: South Goa sightseeing tour & spice plantation.||Panaji @ Day 4: Departure transfer to airport.', '3 Nights hotel accommodation;Daily breakfast and dinner;North & South Goa sightseeing transfers', 'Airfare/Train tickets;Lunch;Personal expenses;Monument entry fees', 'adventure', 'summer', 'weekend'],
      ['5 Days / 4 Nights Exotic Thailand Bangkok & Pattaya Tour', 'international', 'Thailand', '', 'Mumbai Airport', 'Bangkok Airport', '35000', 'Honeymoon, Friends', 'deluxe, premium', 'breakfast', 'Bangkok, Pattaya, Coral Island', 'https://images.unsplash.com/photo-1528127269322-539801943592, https://images.unsplash.com/photo-1552465011-b4e21bf6e79a', 'Pattaya @ Day 1: Arrival in Bangkok & transfer to Pattaya hotel.||Coral Island @ Day 2: Coral Island speedboat tour with lunch.||Bangkok @ Day 3: Transfer back to Bangkok. Afternoon city temple tour.||Bangkok @ Day 4: Departure transfer to Bangkok Airport.', '3 Nights hotel stay;Daily breakfast;Coral Island tour with lunch;Airport & hotel transfers', 'Flights;Thailand visa fees;Dinner;Personal expenses', 'adventure', 'winter', 'new-year']
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

              // Clean leading "Day X:" / "Day X -" / "Day 0X:" prefix from placeName and description
              const cleanPrefix = (str: string) => {
                if (!str) return '';
                let cleaned = str.replace(/^(?:day\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*[:\-\.]*\s*)+/i, '').trim();
                if (cleaned.length > 0) {
                  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                }
                return cleaned;
              };

              placeName = cleanPrefix(placeName);
              description = cleanPrefix(description);
              
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

          // 12. Parse or generate title
          let title = (row.title || row.packageTitle || '').trim();
          if (!title) {
            const dest = packageType === 'international' ? countryName : stateName;
            const daysCount = itinerary.length > 0 ? `${itinerary.length} Days / ${Math.max(1, itinerary.length - 1)} Nights ` : '';
            title = dest ? `${daysCount}${dest} Tour Package` : 'Exciting Travel Package';
          }

          return {
            rowNum,
            data: {
              title,
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
        title: listing.data.title,
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
    <div className="space-y-6 w-full">
      <Card className="border border-slate-200/80 shadow-xs rounded-md overflow-hidden bg-white w-full" style={{ borderRadius: '8px' }}>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-amber-600" />
                Bulk Import Packages
              </CardTitle>
              <CardDescription className="text-gray-500 text-xs mt-1">
                Upload hundreds of travel listings in seconds from a Google Sheet (CSV format)
              </CardDescription>
            </div>
            
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 font-semibold rounded-md py-2.5 px-4 shadow-xs transition-all duration-200 hover:scale-[1.02] text-xs sm:text-sm cursor-pointer"
              style={{ borderRadius: '6px' }}
            >
              <FileDown className="h-4 w-4 text-amber-600" />
              Download CSV Template
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50 text-red-900" style={{ borderRadius: '6px' }}>
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="font-bold">Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-md p-8 text-center transition-colors bg-slate-50/50 flex flex-col items-center justify-center gap-4 relative" style={{ borderRadius: '8px' }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isParsing || isUploading}
            />
            
            <div className="p-3.5 bg-white rounded-md shadow-xs border border-slate-200/80" style={{ borderRadius: '6px' }}>
              {isParsing ? (
                <Loader2 className="h-7 w-7 text-amber-600 animate-spin" />
              ) : (
                <Upload className="h-7 w-7 text-amber-600" />
              )}
            </div>
            
            <div>
              <p className="font-bold text-gray-800 text-sm">
                {fileName ? fileName : 'Choose a CSV file or drag it here'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Only CSV files exported from Excel or Google Sheets are accepted
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3 bg-amber-50/40 border border-amber-200/60 rounded-md p-5 shadow-xs" style={{ borderRadius: '6px' }}>
              <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                  Uploading packages to database...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 bg-amber-100 rounded-md" />
              <div className="flex justify-between text-xs text-slate-600 font-semibold mt-1">
                <span>Total Items: {uploadStats.total}</span>
                <span>Success: {uploadStats.success}</span>
                <span>Failed: {uploadStats.failed}</span>
              </div>
            </div>
          )}

          {/* Summary stats after parsing */}
          {parsedListings.length > 0 && !isUploading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-md bg-slate-50/80 border border-slate-200/80 flex flex-col shadow-xs" style={{ borderRadius: '6px' }}>
                <span className="text-xs font-semibold text-gray-500">Total Packages Found</span>
                <span className="text-2xl font-extrabold text-gray-950 mt-1">{parsedListings.length}</span>
              </div>
              <div className="p-4 rounded-md bg-emerald-50/80 border border-emerald-200/80 flex flex-col shadow-xs" style={{ borderRadius: '6px' }}>
                <span className="text-xs font-semibold text-emerald-700">Valid & Ready to Import</span>
                <span className="text-2xl font-extrabold text-emerald-800 mt-1">{validCount}</span>
              </div>
              <div className="p-4 rounded-md bg-amber-50/80 border border-amber-200/80 flex flex-col shadow-xs" style={{ borderRadius: '6px' }}>
                <span className="text-xs font-semibold text-amber-700">Errors & Warnings Found</span>
                <span className="text-2xl font-extrabold text-amber-800 mt-1">{totalErrors}</span>
              </div>
            </div>
          )}

          {/* Listing Rows Preview */}
          {parsedListings.length > 0 && !isUploading && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-gray-800 text-base">Packages Preview</h3>
                {validCount > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    className="px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02]"
                    style={{ borderRadius: '6px' }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Upload {validCount} Valid Packages
                  </button>
                )}
              </div>

              <div className="border border-slate-200/80 rounded-md overflow-hidden shadow-xs" style={{ borderRadius: '6px' }}>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-bold text-gray-500 border-b border-slate-200/80">
                        <th className="p-3.5 w-12 text-center">Row</th>
                        <th className="p-3.5">Package Title</th>
                        <th className="p-3.5">Destination</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Price (INR)</th>
                        <th className="p-3.5">Days</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {parsedListings.map((listing) => {
                        const destinationName = listing.data.packageType === 'international'
                          ? listing.data.countryName
                          : listing.data.stateName;

                        return (
                          <React.Fragment key={listing.rowNum}>
                            <tr className={`hover:bg-gray-50/50 ${!listing.isValid ? 'bg-red-50/20' : ''}`}>
                              <td className="p-3.5 text-center font-semibold text-gray-500">{listing.rowNum}</td>
                              <td className="p-3.5 font-bold text-gray-900 max-w-xs truncate" title={listing.data.title}>{listing.data.title}</td>
                              <td className="p-3.5 font-medium text-gray-700">{destinationName || <span className="text-red-500">Missing Destination</span>}</td>
                              <td className="p-3.5 capitalize text-gray-600">{listing.data.packageType}</td>
                              <td className="p-3.5 font-semibold text-gray-800">₹{listing.data.cost}</td>
                              <td className="p-3.5 font-medium text-gray-600">{listing.data.itinerary.length} Days</td>
                              <td className="p-3.5">
                                {listing.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md" style={{ borderRadius: '6px' }}>
                                    <CheckCircle className="h-3 w-3 text-emerald-600" /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md" style={{ borderRadius: '6px' }}>
                                    <AlertTriangle className="h-3 w-3 text-red-600" /> Fix Errors
                                  </span>
                                )}
                              </td>
                            </tr>
                            
                            {/* Validation Errors Sub-Row */}
                            {listing.errors.length > 0 && (
                              <tr className="bg-yellow-50/30 border-b border-gray-100">
                                <td colSpan={7} className="p-3 pl-12 text-xs">
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
