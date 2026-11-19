# Project-specific R8 rules.
# Capacitor and its plugins ship their own consumer rules (plugin classes and the
# annotations read by reflection), so nothing is needed for them here.

# Keep line numbers so a release stack trace can be decoded with mapping.txt,
# without exposing the original file names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
