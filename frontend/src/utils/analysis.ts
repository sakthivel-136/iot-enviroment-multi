export const getEnvironmentalAnalysis = (gas: number, temp: number): { status: string, color: string, description: string, recommendation: string } => {
    // Air Quality Analysis
    if (gas === 0 && temp === 0) {
        return {
            status: "OFFLINE",
            color: "text-slate-500",
            description: "Sensor data is currently unavailable.",
            recommendation: "Please check sensor connectivity and power supply."
        };
    }

    if (gas < 150) {
        return {
            status: "EXCELLENT",
            color: "text-emerald-400",
            description: "Air quality is pristine. Ideal for all activities.",
            recommendation: "Perfect conditions for ventilation. Open windows to maintain fresh air circulation."
        };
    } else if (gas < 300) {
        return {
            status: "GOOD",
            color: "text-teal-400",
            description: "Air quality is satisfactory, with little to no risk.",
            recommendation: "Safe for most individuals. Sensitive groups should not be affected."
        };
    } else if (gas < 600) {
        return {
            status: "MODERATE",
            color: "text-yellow-400",
            description: "Acceptable air quality, though specific pollutants may be present.",
            recommendation: "Generally safe, but consider closing windows if you have respiratory sensitivity."
        };
    } else if (gas < 1000) {
        return {
            status: "POOR",
            color: "text-orange-400",
            description: "Pollutant levels are elevated. May affect sensitive individuals.",
            recommendation: "Limit prolonged outdoor exertion. Use air purifiers if available."
        };
    } else {
        return {
            status: "HAZARDOUS",
            color: "text-red-500",
            description: "Critical pollution levels. Risk of serious health effects.",
            recommendation: "WARNING: Avoid all physical activity outdoors. Keep windows closed. Seek medical attention if breathing difficulties occur. Inhaling this air may cause severe respiratory distress."
        };
    }
};

export const getTemperatureAnalysis = (temp: number): { status: string, description: string } => {
    if (temp < 10) return { status: "COLD", description: "Low ambient temperature. Heating recommended." };
    if (temp < 18) return { status: "COOL", description: "Slightly cool but comfortable with light clothing." };
    if (temp < 26) return { status: "OPTIMAL", description: "Ideal thermal comfort range." };
    if (temp < 32) return { status: "WARM", description: "Warm conditions. Ensure adequate hydration." };
    return { status: "HOT", description: "High ambient temperature. Cooling recommended to prevent heat stress." };
};
