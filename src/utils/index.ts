/* b44-full-sync 2026-06-01 */
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}