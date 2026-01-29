export function createEmptyRoute({ name = "New Route", code = "", color = "#2563eb" }) {
    return {
        id: crypto.randomUUID(),
        name,
        code,
        color,

        rawPoints: [],        // manually placed points
        snappedPoints: null,  // API-coordinated path

        history: [],
        future: []
    };
}