// All domains must be whitelisted for security reasons
const FETCH_DOMAIN_WHITELIST = [
  'chefbook-dev.s3.amazonaws.com', // Dev S3
  'chefbook-prod.s3.amazonaws.com', // Prod S3
  'cdn2.pepperplate.com', // Pepperplate import
];
if (process.env.FETCH_DOMAIN_WHITELIST) {
  FETCH_DOMAIN_WHITELIST.push(...process.env.FETCH_DOMAIN_WHITELIST.split(','));
}

export const fetchURLAsBuffer = async (url: string) => {
  if (!FETCH_DOMAIN_WHITELIST.includes(new URL(url).hostname)) {
    throw new Error('Domain not whitelisted');
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - native fetch is not defined in NodeJS yet
  const response = await fetch(url, {
    method: 'GET',
  });

  return response.buffer();
};

