# Generate "Family Profile" app icons (512 / 192 / 180)
# Design: blue gradient rounded square + white "jia" (home) character
# Keep this script ASCII-only so PowerShell 5.1 parses it cleanly.

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param([int]$x, [int]$y, [int]$w, [int]$h, [int]$r)
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function New-Icon {
    param([int]$size, [string]$outPath)

    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $c1 = [System.Drawing.Color]::FromArgb(255, 74, 124, 247)
    $c2 = [System.Drawing.Color]::FromArgb(255, 109, 92, 231)
    $bgRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $c1, $c2, 135.0)

    $radius = [int]($size * 0.2)
    $bgPath = New-RoundedRectPath 0 0 $size $size $radius
    $g.FillPath($grad, $bgPath)

    $pad = [int]($size * 0.10)
    $ringR = [int]($size * 0.14)
    $ring = New-RoundedRectPath $pad $pad ($size - 2 * $pad) ($size - 2 * $pad) $ringR
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 255, 255, 255), ($size * 0.03))
    $g.DrawPath($ringPen, $ring)

    $fontSize = [single]($size * 0.50)
    $font = New-Object System.Drawing.Font('Microsoft YaHei UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $layout = New-Object System.Drawing.RectangleF(0, -($size * 0.02), $size, $size)
    $jiaChar = [string][char]0x5BB6
    $g.DrawString($jiaChar, $font, $white, $layout, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $sf.Dispose(); $white.Dispose(); $font.Dispose(); $ringPen.Dispose()
    $ring.Dispose(); $bgPath.Dispose(); $grad.Dispose()
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("Generated: " + $outPath + " (" + $size + "x" + $size + ")")
}

$iconDir = Join-Path $PSScriptRoot 'icons'
if (-not (Test-Path $iconDir)) { New-Item -ItemType Directory -Path $iconDir | Out-Null }

New-Icon 512 (Join-Path $iconDir 'icon-512.png')
New-Icon 192 (Join-Path $iconDir 'icon-192.png')
New-Icon 180 (Join-Path $iconDir 'apple-touch-icon.png')
Write-Output 'All icons generated.'
