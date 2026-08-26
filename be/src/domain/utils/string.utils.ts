export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  static removeSpaces(str: string): string {
    return str.replace(/\s+/g, '')
  }
}
