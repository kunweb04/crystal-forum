name = "crystal-forum"
compatibility_date = "2024-03-25"
pages_build_output_dir = "./public"

# ------------------------------------
# 预览环境配置 (用于分支部署)
# ------------------------------------
[env.preview]
pages_build_output_dir = "./public"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "crystal-forum-db"
database_id = "bbf38b6a-3b1f-426f-b86b-76afb7399747"

[[env.preview.r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "crystal-forum-assets"

# ------------------------------------
# 生产环境配置 (用于生产分支)
# ------------------------------------
[env.production]
pages_build_output_dir = "./public"

[[env.production.d1_databases]]
binding = "DB"
database_name = "crystal-forum-db"
database_id = "bbf38b6a-3b1f-426f-b86b-76afb7399747"

[[env.proview.r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "crystal-forum-assets"
