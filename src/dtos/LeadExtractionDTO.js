/**
 * LeadExtractionDTO
 * Maps frontend fields to the specific Apify Google Maps Scraper schema
 * (Copied from core backend for consistency)
 */
class LeadExtractionDTO {
    static toApifySchema(data) {
        return {
            categoryFilterWords: Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []),
            city: data.city || "",
            countryCode: (data.country || "us").toLowerCase(),
            includeWebResults: false,
            language: data.language || "en",
            locationQuery: data.location || "",
            maxCrawledPlacesPerSearch: parseInt(data.max_results) || parseInt(data.limit) || 50,
            maxImages: 0,
            maximumLeadsEnrichmentRecords: 0,
            scrapeContacts: true,
            scrapeDirectories: false,
            scrapeImageAuthors: false,
            scrapePlaceDetailPage: false,
            scrapeReviewsPersonalData: true,
            scrapeTableReservationProvider: false,
            searchStringsArray: Array.isArray(data.business_type) ? data.business_type : (Array.isArray(data.keyword) ? data.keyword : [data.keyword || data.business_type || "restaurant"]),
            skipClosedPlaces: !data.include_closed,
            startUrls: (data.manual_urls || []).map(url => ({ url })),
            state: data.state || ""
        };
    }

    static validate(data) {
        const errors = [];
        if (!data.business_type && !data.keyword) errors.push("business_type or keyword is required");
        if (!data.city && !data.location) errors.push("At least city or location is required");
        if (data.country && data.country.length !== 2) errors.push("countryCode must be ISO-2 (e.g., 'us', 'eg')");

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = LeadExtractionDTO;
