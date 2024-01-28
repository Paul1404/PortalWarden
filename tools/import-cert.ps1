# PowerShell script to import a self-signed certificate

# Path to the certificate file relative to the script location
$certPath = Join-Path (Get-Location) "..\ssl\cert.pem"

# Convert .pem to .cer format (DER encoded)
$exportPath = [System.IO.Path]::ChangeExtension($certPath, ".cer")
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$cert.Import($certPath)
[byte[]]$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($exportPath, $certBytes)

# Import the certificate into the Trusted Root Certification Authorities store
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store -ArgumentList "Root", "LocalMachine"
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$store.Add($cert)
$store.Close()

Write-Host "Certificate imported successfully into Trusted Root Certification Authorities."
