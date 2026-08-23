# Libaas by HAYA — AWS Free Tier EC2 Deployment Guide

This procedure deploys the **complete current application**: storefront, protected Studio, Cash on Delivery orders, local JSON data, and local garment uploads. It uses one Ubuntu EC2 virtual machine with Nginx in front of the Node.js application.

> **Choose EC2, not Lambda, Amplify, or S3 static hosting.** The present Libaas application writes persistent order and upload data to a local directory. An EC2 virtual machine with EBS-backed storage supports that architecture; serverless functions and static hosting do not.

## 1. Before you start

You need the downloaded ZIP from the project interface, an AWS account, a domain name if you want HTTPS on your own domain, and a local SSH client. AWS’s current Free Tier terms and credits depend on your account type and current credit balance. Review the AWS Free Tier page and create a billing budget alert before launching resources; do not assume any AWS resource remains free forever.[1]

| Item | Recommended choice | Why it matters |
|---|---|---|
| Compute | Ubuntu Server EC2 instance eligible for your account’s Free Tier/credits | Runs the Node.js + Express application continuously. |
| Storage | EBS-backed root volume, plus a separate data EBS volume only if your budget allows | Keeps `libass-store.json` and garment uploads after normal restarts. AWS recommends separating operating-system and application-data volumes for data protection.[3] |
| Public access | EC2 security group and Nginx | Keeps Node’s internal port private and exposes only HTTP/HTTPS. |
| Domain and TLS | Your domain plus Let’s Encrypt | Provides a trusted HTTPS storefront and Studio. |

## 2. Create the EC2 server

In the AWS Console, open **EC2 → Instances → Launch instance**. Choose the latest Ubuntu LTS image available to your account, select an instance type eligible for your account’s Free Tier or credits, and create a new key pair. Download the `.pem` key immediately; AWS will not show the private key again.

Create one security group with these inbound rules. Security groups are the instance firewall, so only allow the traffic the application needs.[2]

| Protocol | Port | Source | Purpose |
|---|---:|---|---|
| SSH | 22 | **My IP** only | Server administration. Never use `0.0.0.0/0` for SSH. |
| HTTP | 80 | `0.0.0.0/0`, `::/0` | Domain verification and HTTP-to-HTTPS redirect. |
| HTTPS | 443 | `0.0.0.0/0`, `::/0` | Customer storefront and protected Studio. |

Do **not** open port `3000` publicly. Nginx will proxy safely to it from inside the server.

If you plan to attach a domain, allocate a stable public address according to your current AWS account and billing rules, then point your domain’s `A` record to that address. A normal EC2 public IP can change when an instance is stopped and started, so do not configure DNS until you have chosen your stable-address approach.[4]

## 3. Connect and install the server software

On your own computer, restrict the downloaded key and connect to the instance:

```bash
chmod 400 libaas-ec2.pem
ssh -i libaas-ec2.pem ubuntu@YOUR_SERVER_IP
```

On the server, update Ubuntu, install Nginx, Git, Certbot, and Node.js 22 with `pnpm`. Install Node.js 22 using your preferred trusted method, such as the official Node.js package instructions or a managed Node version tool. Then confirm the versions.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git unzip certbot python3-certbot-nginx
node --version
pnpm --version
```

If `node --version` is lower than `v22`, install Node.js 22 before continuing. Do not run the application as `root`.

## 4. Upload the complete code

From your computer, copy the downloaded ZIP and extract it on the server. Replace the local path with the actual ZIP path.

```bash
scp -i libaas-ec2.pem /path/to/libaas-by-haya.zip ubuntu@YOUR_SERVER_IP:/home/ubuntu/
```

Back on the server:

```bash
mkdir -p /home/ubuntu/apps/libaas
unzip /home/ubuntu/libaas-by-haya.zip -d /home/ubuntu/apps/libaas
cd /home/ubuntu/apps/libaas
pnpm install --frozen-lockfile
pnpm run build
```

If the ZIP extracts into a nested directory, `cd` into the folder containing `package.json` before running the last two commands.

## 5. Create persistent data storage and application secrets

The application normally stores data relative to its current directory. Set `LIBASS_DATA_DIR` so the order store and uploads always live in one known protected directory.

```bash
sudo mkdir -p /srv/libaas-data/uploads
sudo chown -R ubuntu:ubuntu /srv/libaas-data
sudo chmod 700 /srv/libaas-data

sudo nano /etc/libaas.env
```

Put the following in `/etc/libaas.env`. Use a strong private Studio passcode and generate a random JWT secret. Do **not** paste real production secrets into GitHub or into the source code.

```text
NODE_ENV=production
PORT=3000
LIBASS_DATA_DIR=/srv/libaas-data
ADMIN_ACCESS_PASSWORD=replace-with-a-long-private-studio-passcode
JWT_SECRET=replace-with-a-random-48-character-or-longer-secret
```

Generate a safe value for `JWT_SECRET` with:

```bash
openssl rand -base64 48
```

Add these only if you intentionally use the connected services:

```text
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_STOREFRONT_API_ACCESS_TOKEN=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Secure the environment file:

```bash
sudo chown root:root /etc/libaas.env
sudo chmod 600 /etc/libaas.env
```

### Optional: transfer existing local data

If you are moving an existing local installation rather than starting empty, copy its `data/libass-store.json` and `data/uploads/` into `/srv/libaas-data/` **before** starting the service. This preserves existing Studio sales, delivery rules, hidden products, orders, reviews, and uploaded garment views.

## 6. Run the application as a system service

Find the installed `pnpm` path:

```bash
command -v pnpm
```

Create the service file:

```bash
sudo nano /etc/systemd/system/libaas.service
```

Replace `PNPM_PATH` with the result of `command -v pnpm`, and make sure `WorkingDirectory` is the folder containing `package.json`.

```ini
[Unit]
Description=Libaas by HAYA storefront
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apps/libaas
EnvironmentFile=/etc/libaas.env
ExecStart=PNPM_PATH start
Restart=always
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Enable and check it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now libaas
sudo systemctl status libaas --no-pager
curl -I http://127.0.0.1:3000/
```

If it fails, inspect the logs without exposing secrets:

```bash
journalctl -u libaas -n 100 --no-pager
```

## 7. Put Nginx in front of Node.js

Create the Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/libaas
```

Use this configuration and replace both domain names:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it and test the Nginx configuration:

```bash
sudo ln -s /etc/nginx/sites-available/libaas /etc/nginx/sites-enabled/libaas
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://YOUR_SERVER_IP` before adding HTTPS. You should see the Libaas introduction.

## 8. Add HTTPS

After the domain’s DNS `A` records point to the server and have propagated, run:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Choose the HTTP-to-HTTPS redirect when prompted. Certbot also installs certificate renewal support; verify it:

```bash
sudo certbot renew --dry-run
```

## 9. Verify the whole website

Check these flows over `https://YOUR_DOMAIN`:

1. Open the home page and enter the Libaas cinematic introduction.
2. Open `/shop` and confirm Azure Garden is present and Sandstone remains unavailable.
3. Open `/admin`, enter the private Studio passcode, and confirm sales, delivery, product media, and orders load.
4. Upload one small garment image and verify it appears after a browser refresh.
5. Create only a non-customer test COD order if you need to test checkout; do not use real customer data for testing.
6. Restart the app with `sudo systemctl restart libaas`, then confirm the uploaded image and Studio settings still exist.

## 10. Back up orders and uploads

The `/srv/libaas-data` directory contains customer order information and uploaded images. Protect it. At minimum, make an encrypted offline copy before updates and download it to a secure private computer:

```bash
sudo tar -C /srv -czf /home/ubuntu/libaas-data-$(date +%F).tar.gz libaas-data
sudo chown ubuntu:ubuntu /home/ubuntu/libaas-data-*.tar.gz
```

Then download the archive with `scp` from your computer. AWS recommends regular EBS snapshots and testing recovery; snapshots and extra storage can consume credits or incur charges, so inspect your AWS Billing dashboard first.[3]

## 11. Updating the site later

Before every update, back up `/srv/libaas-data`. Then upload the new ZIP, extract it into the application directory, reinstall/build, and restart the service:

```bash
cd /home/ubuntu/apps/libaas
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl restart libaas
sudo systemctl status libaas --no-pager
```

Do not delete `/srv/libaas-data` during updates. It is intentionally outside the application source directory.

## Cost and reliability note

This EC2 approach is the correct architecture for the current file-based Libaas app, but it is **not automatically zero-cost forever**. AWS’s current Free Tier for new accounts provides time- and credit-limited access, while ongoing use can require conversion to a paid plan or consume credits.[1] Watch the Billing dashboard, set a budget alert, and stop unneeded resources. Do not terminate the server or delete its data volume without first downloading a backup.

## References

[1]: https://aws.amazon.com/free/ "AWS Free Tier"
[2]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html "Amazon EC2 security groups"
[3]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-best-practices.html "Best practices for Amazon EC2"
[4]: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-quick-start-guide-nodejs.html "Deploy and manage a Node.js stack on Lightsail"
