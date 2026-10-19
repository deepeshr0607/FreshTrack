Pod::Spec.new do |s|
  s.name = 'FreshTrackReceiptLayout'
  s.version = '1.0.0'
  s.summary = 'Local receipt text positions for FreshTrack'
  s.description = 'Apple Vision recognition with bounded on-device text positions.'
  s.license = { :type => 'Private' }
  s.author = 'FreshTrack'
  s.homepage = 'https://expo.dev'
  s.source = { :git => 'https://expo.dev' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'ImageIO', 'CoreGraphics'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
