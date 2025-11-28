export const getApiUrl = (path: string) => {
    // In development/web, this can be empty to use relative paths
    // In mobile build, this should be the full URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}
