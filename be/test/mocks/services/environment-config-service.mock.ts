import { IAwsConfig } from '@domain/config/aws.interface'

export const environmentConfigServiceMock: Partial<IAwsConfig> = {
  getAwsCognitoClientId: () => '1X2X3X4X5X6X7X8X9X0X',
  getAwsCognitoUserPoolId: () => 'us-east-1_1X2X3X4X5X6',
  getAwsRegion: () => 'us-east-1',
  getAwsCognitoAuthorityUrl: () => 'https://example.com',
}
