import { z } from 'zod';

const importProblemSchema = z
  .object({
    url: z
      .string({
        error: () => 'URL is required',
      })
      .trim()
      .min(1, 'URL cannot be empty')
      .max(2000, 'URL cannot exceed 2000 characters')
      .refine(
        (val) => {
          try {
            const parsed = new URL(val);

            // HTTPS only
            if (parsed.protocol !== 'https:') {
              return false;
            }

            // Reject credentials in URL
            if (parsed.username || parsed.password) {
              return false;
            }

            const host = parsed.hostname.toLowerCase();

            // Supported domains only
            const allowedDomains = [
              'leetcode.com',
              'www.leetcode.com',
              'geeksforgeeks.org',
              'www.geeksforgeeks.org',
            ];
            if (!allowedDomains.includes(host)) {
              return false;
            }

            // Reject localhost, IP address hosts, private networks
            const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
            const ipv6Regex = /^\[?[0-9a-fA-F:]+\]?$/;
            if (
              host === 'localhost' ||
              ipv4Regex.test(host) ||
              ipv6Regex.test(host)
            ) {
              return false;
            }

            return true;
          } catch (e) {
            return false;
          }
        },
        {
          message: 'Invalid or unsupported URL. Only HTTPS URLs from LeetCode or GeeksforGeeks are supported.',
        }
      ),
  })
  .strict();

export { importProblemSchema };
export default importProblemSchema;
