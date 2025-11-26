# visual-differ

CLI tool for comparing PNG screenshots between two directories using pixel-perfect image comparison with HTML reports.

Image comparison powered by [pixelmatch](https://github.com/mapbox/pixelmatch).

## Usage

```bash
npx visual-differ <baseline-dir> <candidate-dir> <output-dir>
```

### Arguments

- `<baseline-dir>` - Directory containing baseline screenshots
- `<candidate-dir>` - Directory containing candidate screenshots
- `<output-dir>` - Directory where the HTML report will be written

### Output

- **HTML Report** at `output-dir/report.html` - Visual comparison with side-by-side images and diffs
- **Diff Images** at `output-dir/*.png` - Visual diff overlays for changed images

### Exit Codes

- `0` - All images match
- `1` - Differences detected or files removed

## CI Integration

The exit codes make this tool suitable for CI/CD pipelines. A non-zero exit code will fail your build when visual regressions are detected.

## Requirements

- Node.js >= 24.0.0
- PNG images only

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.
