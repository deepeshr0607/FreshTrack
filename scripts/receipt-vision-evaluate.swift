// Local macOS PUBLIC-image evaluation only; not the mobile OCR adapter or an iPhone accuracy test.
import Foundation
import Vision
import ImageIO
import CoreGraphics

guard CommandLine.arguments.count == 3 else { fatalError("Usage: swift receipt-vision-evaluate.swift INPUT OUTPUT_JSON") }
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
print("Recognized \(lines.count) lines; \(image.width)x\(image.height)")
