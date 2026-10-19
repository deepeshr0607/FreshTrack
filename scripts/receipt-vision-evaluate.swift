// Local macOS PUBLIC-image evaluation only; not the mobile OCR adapter or an iPhone accuracy test.
import Foundation
import Vision
import ImageIO
import CoreGraphics

guard (3...4).contains(CommandLine.arguments.count) else { fatalError("Usage: swift receipt-vision-evaluate.swift INPUT OUTPUT_JSON [LAYOUT_JSON]") }
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceThumbnailMaxPixelSize: 2000,
        kCGImageSourceCreateThumbnailWithTransform: true,
      ] as CFDictionary) else { fatalError("Unable to read evaluation image") }
// Match the installed extractor's default request and topCandidates(1) string projection.
// JPEG recompression, UIKit decoding and the physical device are not reproduced.
let request = VNRecognizeTextRequest()
try VNImageRequestHandler(cgImage: image).perform([request])
let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
try JSONSerialization.data(withJSONObject: lines, options: [.prettyPrinted, .sortedKeys]).write(to: output)
// Optional local-only geometry: normalized top-left coordinates, tied to the exact string IDs.
// Keep the original string output unchanged for the pinned accuracy comparison.
if CommandLine.arguments.count == 4 {
  let observations = (request.results ?? []).compactMap { observation -> [String: Any]? in
    guard let text = observation.topCandidates(1).first?.string else { return nil }
    let box = observation.boundingBox
    return ["text": text, "box": ["x": box.minX, "y": 1 - box.maxY, "width": box.width, "height": box.height]]
  }
  try JSONSerialization.data(withJSONObject: observations.enumerated().map { index, value in
    var line = value
    line["id"] = "line-\(index)"
    return line
  }, options: [.prettyPrinted, .sortedKeys]).write(to: URL(fileURLWithPath: CommandLine.arguments[3]))
}
print("Recognized \(lines.count) lines; \(image.width)x\(image.height)")
