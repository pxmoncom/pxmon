# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in PXMON, please report it responsibly:

1. Send an email to **security@pxmon.com**
2. Include a detailed description of the vulnerability
3. Provide steps to reproduce the issue
4. Include any relevant transaction signatures or account addresses

### What to Include

- Description of the vulnerability
- Attack vector and potential impact
- Steps to reproduce
- Affected components (on-chain program, API, SDK, agents)
- Suggested fix if you have one

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Target**: Within 30 days for critical issues

### Scope

The following are in scope for security reports:

- On-chain program vulnerabilities (unauthorized access, fund drainage, state corruption)
- API server vulnerabilities (authentication bypass, injection, data exposure)
- SDK vulnerabilities (transaction manipulation, key exposure)
- Agent script vulnerabilities (strategy exploitation, unauthorized actions)

### Out of Scope

- Social engineering attacks
- Denial of service via rate limiting (already mitigated)
- Vulnerabilities in third-party dependencies (report to the upstream project)
- Issues that require physical access to the server

## On-chain Program Security

The PXMON on-chain program handles game state and in some contexts value transfer. We take the following measures:

- All instructions validate signer authority
- Account ownership checks on every instruction
- PDA derivation uses deterministic seeds with bump validation
- Numeric operations use checked arithmetic to prevent overflow
- State transitions are validated against game rules
- Program upgrade authority is held in a multisig

## Responsible Disclosure

We ask that you:

- Give us reasonable time to address the vulnerability before public disclosure
- Do not access or modify other users' data
- Do not degrade the service for other users
- Act in good faith

We commit to:

- Not pursuing legal action against good-faith security researchers
- Crediting researchers who report valid vulnerabilities (with permission)
- Keeping reporters informed of remediation progress